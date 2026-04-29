import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import { formatCurrency, getPaymentStatusLabel } from '../../shared/domain/academy'
import { selectCurrentMensalidade } from '../../shared/domain/studentSummary'
import { supabase } from '../../shared/lib/supabase'
import { fetchStudentPayments, requestPixPayment } from '../../shared/lib/studentQueries'

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusTone(status: string) {
  switch (status) {
    case 'paid':
      return 'success'
    case 'overdue':
      return 'danger'
    case 'cancelled':
      return 'default'
    default:
      return 'warning'
  }
}

function PaymentStatusBadge({ status }: { status: string | null }) {
  const label = getPaymentStatusLabel(status)
  const tone = statusTone(status ?? 'pending')

  return (
    <span className={`badge badge-${tone}`}>{label}</span>
  )
}

function copyToClipboard(text: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

export function StudentPaymentPage() {
  const { isPlaceholderMode, profile } = useAuth()
  const queryClient = useQueryClient()
  const academyId = profile?.academyId ?? undefined
  const canUseSupabase = Boolean(supabase && academyId && profile?.id && !isPlaceholderMode)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const paymentsQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchStudentPayments(supabase, profile?.id, academyId),
    queryKey: ['student-payments', academyId, profile?.id]
  })

  const pixMutation = useMutation({
    mutationFn: () => requestPixPayment({ client: supabase }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-payments', academyId, profile?.id] })
    }
  })

  const allPayments = paymentsQuery.data ?? []
  const currentPayment = selectCurrentMensalidade(allPayments)
  const hasPixPayload = currentPayment?.pix_qr_code_payload

  const handleRequestPix = () => {
    pixMutation.mutate()
  }

  const handleCopyPaste = async () => {
    if (!currentPayment?.pix_copy_paste) return
    try {
      await copyToClipboard(currentPayment.pix_copy_paste)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // fallback already handled in copyToClipboard
    }
  }

  const historyPayments = allPayments.slice(0, 6)

  return (
    <section>
      <PageHeader
        eyebrow="Mensalidade"
        title="Pagamento Pix"
        description="Visualize o QR Code Pix, copie o codigo ou solicite um novo pagamento."
      />

      {!canUseSupabase ? (
        <EmptyState
          title="Mensalidade em modo local"
          description="Configure Supabase e vincule seu perfil a um aluno para ver a mensalidade Pix."
        />
      ) : null}

      {paymentsQuery.isLoading ? (
        <LoadingState title="Carregando mensalidade" description="Buscando dados de pagamento Pix." />
      ) : null}

      {paymentsQuery.error ? (
        <ErrorState title="Erro ao carregar mensalidade" description="Nao foi possivel buscar os dados de pagamento." />
      ) : null}

      {canUseSupabase && !paymentsQuery.isLoading && !paymentsQuery.error && allPayments.length === 0 ? (
        <EmptyState
          title="Nenhuma mensalidade encontrada"
          description="Solicite seu primeiro pagamento Pix para gerar o QR Code."
          action={
            <Button
              variant="accent"
              onClick={handleRequestPix}
              disabled={pixMutation.isPending}
            >
              {pixMutation.isPending ? 'Solicitando...' : 'Solicitar Pix'}
            </Button>
          }
        />
      ) : null}

      {canUseSupabase && !paymentsQuery.isLoading && !paymentsQuery.error && currentPayment ? (
        <>
          <div className="card payment-current">
            <div className="payment-header">
              <h2>Mensalidade atual</h2>
              <PaymentStatusBadge status={currentPayment.status} />
            </div>

            <div className="payment-amount">
              <span className="amount-label">Valor</span>
              <span className="amount-value">
                {currentPayment.amount ? formatCurrency(currentPayment.amount) : '—'}
              </span>
            </div>

            <div className="payment-due">
              <span className="due-label">Vencimento</span>
              <span className="due-value">{formatDate(currentPayment.due_date)}</span>
            </div>

            {!hasPixPayload ? (
              <div className="payment-action">
                <Button
                  variant="accent"
                  onClick={handleRequestPix}
                  disabled={pixMutation.isPending}
                >
                  {pixMutation.isPending ? 'Solicitando...' : 'Solicitar Pix'}
                </Button>
                {pixMutation.error ? (
                  <p className="error-text">
                    {pixMutation.error instanceof Error ? pixMutation.error.message : 'Erro ao solicitar Pix.'}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="pix-section">
                <div className="pix-qr">
                  <QRCodeSVG
                    value={currentPayment.pix_qr_code_payload ?? ''}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="pix-copy">
                  <Button
                    variant="secondary"
                    onClick={handleCopyPaste}
                    disabled={!currentPayment.pix_copy_paste}
                  >
                    {copyFeedback ? 'Copiado!' : 'Copiar codigo Pix'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {historyPayments.length > 0 ? (
            <div className="card payment-history">
              <h2>Historico de pagamentos</h2>
              <ul className="payment-list">
                {historyPayments.map((payment) => (
                  <li key={payment.id} className="payment-item">
                    <div className="payment-item-info">
                      <span className="payment-item-date">{formatDate(payment.due_date)}</span>
                      <span className="payment-item-amount">
                        {payment.amount ? formatCurrency(payment.amount) : '—'}
                      </span>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

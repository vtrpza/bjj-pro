import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { PageHeader } from '../../shared/components/PageHeader'
import { getQrStatus } from '../../shared/lib/qrCheckin'
import type { QrSessionResponse } from '../../shared/lib/qrCheckin'
import { hasSupabaseConfig, supabase } from '../../shared/lib/supabase'

export function CheckinsPage() {
  const { isPlaceholderMode, profile } = useAuth()
  const [qrSession, setQrSession] = useState<QrSessionResponse | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const qrStatus = getQrStatus(qrSession?.expiresAt, nowMs)
  const isExpired = qrStatus.isExpired

  useEffect(() => {
    if (!qrSession) {
      return
    }

    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [qrSession])

  async function generateQrSession() {
    if (!supabase || !profile) {
      setErrorMessage('Conecte o Supabase para gerar QR real do treino.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setNowMs(Date.now())

    const { data, error } = await supabase.functions.invoke<QrSessionResponse>('qr-session-token', {
      body: { academyId: profile.academyId }
    })

    setIsLoading(false)

    if (error) {
      setErrorMessage(error.message || 'Nao foi possivel gerar o QR do treino.')
      return
    }

    setQrSession(data)
  }

  return (
    <section>
      <PageHeader
        eyebrow="Treinos"
        title="Check-ins no treino"
        description="A academia gera QR de sessao curto e revisa presencas validadas pelo backend."
        action={
          <Button disabled={isLoading || !hasSupabaseConfig} onClick={generateQrSession} variant="accent">
            {isLoading ? 'Gerando...' : isExpired ? 'Gerar QR do treino' : 'Renovar QR'}
          </Button>
        }
      />
      <div className="qr-session-grid">
        <div className="card qr-display-card">
          {qrSession && !isExpired ? (
            <QRCodeSVG aria-label="QR do treino atual" includeMargin size={256} value={qrSession.token} />
          ) : (
            <div className="qr-placeholder" aria-hidden="true">JJ</div>
          )}
          <div className="qr-status">
            <strong>{qrStatus.label}</strong>
            <span>{qrSession ? qrSession.title : 'Nenhum QR ativo para o treino.'}</span>
          </div>
        </div>

        <div className="card qr-details-card">
          <h2>Codigo manual</h2>
          <p>Use este codigo quando a camera do aluno nao estiver disponivel. Ele expira junto com o QR.</p>
          <strong className="manual-code">{qrSession && !isExpired ? qrSession.manualCode : '------'}</strong>
          {qrSession ? <small>Expira em {new Date(qrSession.expiresAt).toLocaleTimeString('pt-BR')}</small> : null}
          {qrSession && !isExpired ? (
            <Link to={`/admin/check-ins/review/${qrSession.sessionId}`} style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              <Button variant="secondary">Revisar presencas</Button>
            </Link>
          ) : null}
          {isPlaceholderMode ? <small className="form-error">Modo local: configure o Supabase para acionar Edge Functions.</small> : null}
          {errorMessage ? <small className="form-error">{errorMessage}</small> : null}
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthContext'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import { StatCard } from '../../shared/components/StatCard'
import { formatCurrency, getPaymentStatusLabel, isDateBeforeToday, isSameLocalMonth } from '../../shared/domain/academy'
import { supabase } from '../../shared/lib/supabase'
import { fetchAdminPayments } from '../../shared/lib/academyQueries'

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

type FilterOption = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled'

const filterOptions: { label: string; value: FilterOption }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Vencidos', value: 'overdue' },
  { label: 'Cancelados', value: 'cancelled' }
]

export function PaymentsPage() {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const canUseSupabase = Boolean(supabase && academyId && !isPlaceholderMode)
  const [filter, setFilter] = useState<FilterOption>('all')

  const paymentsQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchAdminPayments(supabase, academyId),
    queryKey: ['admin-payments', academyId]
  })

  const allPayments = paymentsQuery.data ?? []

  const filteredPayments = filter === 'all'
    ? allPayments
    : allPayments.filter((p) => p.status === filter)

  const totalPending = allPayments
    .filter((p) => p.status === 'pending' || p.status === null)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const totalPaidThisMonth = allPayments
    .filter((p) => p.status === 'paid' && isSameLocalMonth(p.paid_at))
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const totalOverdue = allPayments
    .filter((p) => p.status !== 'paid' && p.status !== 'cancelled' && isDateBeforeToday(p.due_date))
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const countOverdue = allPayments
    .filter((p) => p.status !== 'paid' && p.status !== 'cancelled' && isDateBeforeToday(p.due_date)).length

  return (
    <section>
      <PageHeader
        eyebrow="Mensalidades"
        title="Pagamentos Pix"
        description="Acompanhe o status de pagamentos da academia, mensalidades pendentes e receita confirmada."
      />

      {!canUseSupabase ? (
        <EmptyState
          title="Mensalidades em modo local"
          description="Configure Supabase para visualizar pagamentos reais da academia."
        />
      ) : null}

      {paymentsQuery.isLoading ? (
        <LoadingState title="Carregando pagamentos" description="Buscando dados de mensalidades da academia." />
      ) : null}

      {paymentsQuery.error ? (
        <ErrorState title="Erro ao carregar pagamentos" description="Nao foi possivel buscar os dados de pagamento." />
      ) : null}

      {canUseSupabase && !paymentsQuery.isLoading && !paymentsQuery.error && allPayments.length === 0 ? (
        <EmptyState
          title="Nenhum pagamento registrado"
          description="Os pagamentos apareceram aqui quando os alunos solicitarem mensalidades via Pix."
        />
      ) : null}

      {canUseSupabase && !paymentsQuery.isLoading && !paymentsQuery.error && allPayments.length > 0 ? (
        <>
          <div className="stats-grid three">
            <StatCard
              label="Pendentes"
              value={formatCurrency(totalPending)}
              tone="warning"
              detail={`${allPayments.filter((p) => p.status === 'pending' || p.status === null).length} mensalidades`}
            />
            <StatCard
              label="Receita confirmada (mes)"
              value={formatCurrency(totalPaidThisMonth)}
              tone="success"
              detail={`${allPayments.filter((p) => p.status === 'paid' && isSameLocalMonth(p.paid_at)).length} pagamentos`}
            />
            <StatCard
              label="Vencidos"
              value={formatCurrency(totalOverdue)}
              tone="danger"
              detail={`${countOverdue} mensalidade${countOverdue === 1 ? '' : 's'}`}
            />
          </div>

          <div className="card payment-filter-card">
            <div className="filter-row">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  className={`filter-btn ${filter === option.value ? 'active' : ''}`}
                  onClick={() => setFilter(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card payment-list-card">
            <ul className="payment-admin-list">
              {filteredPayments.map((payment) => (
                <li key={payment.id} className="payment-admin-item">
                  <div className="payment-admin-info">
                    <Link to={`/admin/alunos`} className="payment-student-name">
                      {payment.student_name}
                    </Link>
                    <span className="payment-admin-date">{formatDate(payment.due_date)}</span>
                  </div>
                  <div className="payment-admin-meta">
                    <span className="payment-admin-amount">
                      {payment.amount ? formatCurrency(payment.amount) : '—'}
                    </span>
                    <span className={`badge badge-${statusTone(payment.status ?? 'pending')}`}>
                      {getPaymentStatusLabel(payment.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {filteredPayments.length === 0 ? (
              <p className="empty-filter">Nenhum pagamento com filtro "{filterOptions.find((o) => o.value === filter)?.label}".</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}

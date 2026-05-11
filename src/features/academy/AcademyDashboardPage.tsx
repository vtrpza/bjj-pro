import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../app/providers/AuthContext'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import { PageHeader } from '../../shared/components/PageHeader'
import { StatCard } from '../../shared/components/StatCard'
import { calculateDashboardMetrics, formatCurrency } from '../../shared/domain/academy'
import { fetchDashboardData } from '../../shared/lib/academyQueries'
import { supabase } from '../../shared/lib/supabase'

export function AcademyDashboardPage() {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const canUseSupabase = Boolean(supabase && academyId && !isPlaceholderMode)
  const dashboardQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchDashboardData(supabase, academyId),
    queryKey: ['dashboard', academyId]
  })
  const metrics = dashboardQuery.data
    ? calculateDashboardMetrics(dashboardQuery.data)
    : {
        activeStudents: 0,
        monthlyRevenue: 0,
        openPixPayments: 0,
        overdueMensalidades: 0,
        todayCheckins: 0
      }

  return (
    <section>
      <PageHeader
        eyebrow="Painel da academia"
        title="Operacao de hoje"
        description="Acompanhe alunos ativos, check-ins no treino, mensalidades Pix e receita mensal."
      />

      <div className="stats-grid">
        <StatCard label="Alunos ativos" value={String(metrics.activeStudents)} detail="Status ativo na academia" />
        <StatCard
          label="Mensalidades vencidas"
          value={String(metrics.overdueMensalidades)}
          tone="danger"
          detail="Alunos ou Pix em atraso"
        />
        <StatCard
          label="Check-ins hoje"
          value={String(metrics.todayCheckins)}
          tone="success"
          detail="Presencas validadas no treino"
        />
        <StatCard
          label="Receita mensal"
          value={formatCurrency(metrics.monthlyRevenue)}
          tone="warning"
          detail="Somente mensalidades pagas"
        />
      </div>

      {canUseSupabase && dashboardQuery.isLoading ? (
        <LoadingState title="Atualizando painel" description="Buscando alunos, check-ins e mensalidades." />
      ) : null}

      {canUseSupabase && dashboardQuery.error ? (
        <ErrorState
          title="Nao foi possivel carregar o painel"
          description="Confira RLS e as tabelas students, payments e checkins antes do piloto."
        />
      ) : null}

      {!canUseSupabase ? (
        <EmptyState
          title="Dados locais de demonstracao"
          description="Configure Supabase e um perfil com academy_id para ler metricas reais da academia piloto."
        />
      ) : (
        <div className="card next-card">
          <h2>💰 Pix em aberto</h2>
          <p>{metrics.openPixPayments} mensalidade{metrics.openPixPayments === 1 ? '' : 's'} aguardando webhook confirmado da Asaas.</p>
        </div>
      )}
    </section>
  )
}

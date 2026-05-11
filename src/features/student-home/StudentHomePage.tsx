import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthContext'
import { PageHeader } from '../../shared/components/PageHeader'
import { StatCard } from '../../shared/components/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import { buildStudentSummary } from '../../shared/domain/studentSummary'
import type { BjjBelt } from '../../shared/domain/academy'
import { fetchLinkedStudentExperience } from '../../shared/lib/studentQueries'
import { supabase } from '../../shared/lib/supabase'

const beltClassMap: Record<BjjBelt, string> = {
  Amarela: 'belt-amarela',
  Azul: 'belt-azul',
  Branca: 'belt-branca',
  Cinza: 'belt-cinza',
  Laranja: 'belt-laranja',
  Marrom: 'belt-marrom',
  Preta: 'belt-preta',
  Roxa: 'belt-roxa',
  Verde: 'belt-verde'
}

function formatCheckinTime(isoString: string) {
  const date = new Date(isoString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit'
  })
}

export function StudentHomePage() {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const canUseSupabase = Boolean(supabase && academyId && profile?.id && !isPlaceholderMode)
  const studentQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchLinkedStudentExperience({ academyId, client: supabase, profileId: profile?.id }),
    queryKey: ['student-experience', academyId, profile?.id]
  })
  const experience = studentQuery.data
  const summary = experience?.student
    ? buildStudentSummary({
        checkins: experience.checkins,
        payments: experience.payments,
        rules: experience.rules,
        student: experience.student
      })
    : null

  const lastCheckin = experience?.checkins?.[0] ?? null
  const studentBelt = experience?.student?.belt_name ?? null
  const beltClass = studentBelt ? beltClassMap[studentBelt] : 'belt-branca'

  return (
    <section>
      <PageHeader
        eyebrow="Area do aluno"
        title={experience?.profile.full_name ? `Seu Jiu-Jitsu, ${experience.profile.full_name}` : 'Seu Jiu-Jitsu'}
        description="Veja mensalidade, faixa/grau, progresso e acesse o check-in do treino."
        action={<Link className="btn accent" to="/aluno/check-in">Fazer check-in</Link>}
      />

      {!canUseSupabase ? (
        <EmptyState
          title="Area do aluno em modo local"
          description="Configure Supabase e vincule o perfil do usuario a um aluno para exibir mensalidade, faixa/grau e check-ins reais."
        />
      ) : null}

      {studentQuery.isLoading ? <LoadingState title="Carregando aluno" description="Buscando seu perfil, mensalidade Pix e progresso de graduacao." /> : null}

      {studentQuery.error ? (
        <ErrorState title="Erro ao carregar area do aluno" description="Confira RLS e o vinculo entre profiles, academy_members e students." />
      ) : null}

      {canUseSupabase && !studentQuery.isLoading && !studentQuery.error && experience && !experience.student ? (
        <EmptyState
          title="Aluno ainda nao vinculado"
          description="Sua conta existe, mas ainda nao ha um registro em students vinculado ao seu profile_id nesta Academia de Jiu-Jitsu."
        />
      ) : null}

      {summary ? (
        <>
          <div className="stats-grid two">
            <StatCard
              label="Mensalidade"
              value={summary.paymentStatusLabel}
              tone={summary.paymentStatus === 'paid' ? 'success' : summary.paymentStatus === 'overdue' ? 'danger' : 'warning'}
              detail={summary.paymentDetail}
            />
            <StatCard label="Graduacao" value={summary.beltLabel} detail={summary.progressDetail} />
          </div>

          <div className="card next-card">
            <h2>📈 Progresso informado por presencas</h2>
            <div className="progress-track" aria-label={`Progresso ${summary.progressPercent}%`}>
              <span className={beltClass} style={{ width: `${summary.progressPercent}%` }} />
            </div>
            <p>{summary.progressDetail}</p>
            <p>Promocoes de grau e faixa continuam aprovadas manualmente pela academia.</p>
          </div>

          <div className="card next-card quick-actions-card">
            <h2>⚡ Acoes rapidas</h2>
            <Link className="btn accent block" to="/aluno/check-in">Fazer check-in</Link>
            {lastCheckin ? (
              <p className="last-checkin">Ultimo check-in: {formatCheckinTime(lastCheckin.checked_in_at)}</p>
            ) : (
              <p className="last-checkin">Nenhum check-in recente</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

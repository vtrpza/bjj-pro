import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import type { CheckinCorrectionResponse, CheckinReviewRecord, TrainingSessionRecord } from '../../shared/domain/academy'
import { fetchCheckinsBySession, fetchSessionDetails } from '../../shared/lib/academyQueries'
import { hasSupabaseConfig, supabase } from '../../shared/lib/supabase'

export function CheckinReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { isPlaceholderMode } = useAuth()
  const [session, setSession] = useState<TrainingSessionRecord | null>(null)
  const [checkins, setCheckins] = useState<CheckinReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!sessionId || !supabase) {
      setError('Sessao ou conexao nao disponivel.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await supabase.auth.getSession().then((r) => r.data.session?.access_token ?? null)
      if (!token) {
        setError('Sessao expirada. Faca login novamente.')
        setLoading(false)
        return
      }

      const [sessionData, checkinsData] = await Promise.all([
        fetchSessionDetails(supabase, undefined, sessionId),
        fetchCheckinsBySession(supabase, undefined, sessionId)
      ])

      if (!sessionData) {
        setError('Treino nao encontrado.')
        setLoading(false)
        return
      }

      setSession(sessionData)
      setCheckins(checkinsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar presencas.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useState(() => {
    loadData()
  })

  async function handleCorrect(checkinId: string) {
    if (!reason.trim() || reason.trim().length < 5) {
      return
    }

    setSubmitting(true)
    setSuccessMessage(null)

    try {
      const token = await supabase?.auth.getSession().then((r) => r.data.session?.access_token ?? null)

      if (!supabase || !token) {
        setError('Conexao nao disponivel.')
        return
      }

      const { data, error: fnError } = await supabase.functions.invoke<CheckinCorrectionResponse>('checkin-correct', {
        body: { checkinId, reason: reason.trim() },
        headers: { Authorization: `Bearer ${token}` }
      })

      if (fnError) {
        setError(fnError.message || 'Nao foi possivel corrigir o check-in.')
        return
      }

      if (data?.success) {
        setCheckins((prev) =>
          prev.map((c) => (c.id === checkinId ? { ...c, status: 'cancelled' as const } : c))
        )
        setCorrectingId(null)
        setReason('')
        setSuccessMessage('Presenca corrigida com sucesso.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao corrigir check-in.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingState title="Carregando presencas" description="Buscando presencas do treino..." />
  }

  if (error && !session) {
    return (
      <ErrorState
        title="Erro ao carregar"
        description={error}
        action={
          <Button onClick={loadData} variant="secondary">
            Tentar novamente
          </Button>
        }
      />
    )
  }

  if (!session) {
    return <EmptyState title="Treino nao encontrado" description="Nao foi possivel encontrar o treino solicitado." />
  }

  const activeCheckins = checkins.filter((c) => c.status === 'valid')
  const cancelledCheckins = checkins.filter((c) => c.status === 'cancelled')

  return (
    <section>
      <PageHeader
        eyebrow="Revisao de presencas"
        title={session.title}
        description={`Treino de ${new Date(session.training_date + 'T12:00:00').toLocaleDateString('pt-BR')} — ${checkins.length} presenca(s), ${activeCheckins.length} ativa(s)`}
      />

      {isPlaceholderMode ? (
        <small className="form-error">Modo local: configure o Supabase para corrigir presencas.</small>
      ) : null}

      {error ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p className="form-error">{error}</p>
          <Button onClick={() => setError(null)} variant="secondary" style={{ marginTop: '0.5rem' }}>
            Fechar
          </Button>
        </div>
      ) : null}

      {successMessage ? (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #22c55e' }}>
          <p style={{ margin: 0 }}>{successMessage}</p>
          <Button onClick={() => setSuccessMessage(null)} variant="secondary" style={{ marginTop: '0.5rem' }}>
            Fechar
          </Button>
        </div>
      ) : null}

      {checkins.length === 0 ? (
        <EmptyState
          title="Nenhuma presenca"
          description="Nenhum aluno fez check-in neste treino ainda."
        />
      ) : (
        <div className="card">
          <h2>Presencas ativas</h2>
          {activeCheckins.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>Nenhuma presenca ativa.</p>
          ) : (
            <ul className="checkin-list" style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
              {activeCheckins.map((checkin) => (
                <li
                  key={checkin.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    padding: '0.75rem 0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <strong>{checkin.student_name}</strong>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
                        {new Date(checkin.checked_in_at).toLocaleTimeString('pt-BR')} — {checkin.source === 'qr' ? 'QR Code' : 'Codigo manual'}
                      </div>
                    </div>
                    {correctingId === checkin.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                        <input
                          aria-label="Motivo da correcao"
                          className="input-field"
                          maxLength={200}
                          minLength={5}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Motivo (min. 5 caracteres)"
                          required
                          type="text"
                          value={reason}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            disabled={submitting || reason.trim().length < 5 || !hasSupabaseConfig}
                            onClick={() => handleCorrect(checkin.id)}
                            variant="accent"
                          >
                            {submitting ? 'Corrigindo...' : 'Confirmar'}
                          </Button>
                          <Button
                            disabled={submitting}
                            onClick={() => {
                              setCorrectingId(null)
                              setReason('')
                            }}
                            variant="secondary"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        disabled={!hasSupabaseConfig}
                        onClick={() => {
                          setCorrectingId(checkin.id)
                          setReason('')
                          setSuccessMessage(null)
                        }}
                        variant="secondary"
                      >
                        Corrigir
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cancelledCheckins.length > 0 ? (
            <>
              <h2 style={{ marginTop: '1.5rem' }}>Presencas canceladas</h2>
              <ul className="checkin-list" style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
                {cancelledCheckins.map((checkin) => (
                  <li
                    key={checkin.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      padding: '0.75rem 0',
                      opacity: 0.6
                    }}
                  >
                    <div>
                      <strong>{checkin.student_name}</strong>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
                        {new Date(checkin.checked_in_at).toLocaleTimeString('pt-BR')} — Cancelado
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </section>
  )
}

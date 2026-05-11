import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../app/providers/AuthContext'
import { supabase } from '../../shared/lib/supabase'
import { PageHeader } from '../../shared/components/PageHeader'
import { Button } from '../../shared/components/Button'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import {
  ADULT_BELT_PATH,
  KIDS_BELT_PATH,
  type BjjBelt,
  type BjjBeltOption,
  type GraduationPromotionRequest,
  type GraduationStudentRecord
} from '../../shared/domain/academy'
import {
  fetchBjjBelts,
  fetchGraduationStudents,
  promoteStudent
} from '../../shared/lib/academyQueries'
import { formatBeltAndGrau } from '../../shared/domain/studentSummary'

function getBeltClass(belt: BjjBelt): string {
  return `belt-${belt.toLowerCase()}`
}

function getBeltPath(audience: 'adult' | 'kids'): BjjBelt[] {
  return audience === 'adult' ? ADULT_BELT_PATH : KIDS_BELT_PATH
}

function StudentGraduationView({ student }: { student: NonNullable<GraduationStudentRecord> }) {
  const beltPath = getBeltPath(student.belt_audience)
  const currentBelt = student.belt_name
  const currentGrau = student.grau
  const currentIndex = beltPath.indexOf(currentBelt)
  const progressPercent = student.requiredCheckins > 0
    ? Math.min(100, Math.round((student.checkinsForCurrentGrau / student.requiredCheckins) * 100))
    : 0

  return (
    <section className="graduation-student-view">
      <div className="card belt-preview">
        <span className={`belt-bar ${getBeltClass(currentBelt)}`} aria-hidden="true" />
        <div>
          <strong>{formatBeltAndGrau(currentBelt, currentGrau)}</strong>
          <p>Promocoes sao aprovadas manualmente pela academia.</p>
        </div>
      </div>

      <div className="card progress-card">
        <h2>Progresso para o proximo grau</h2>
        <div className="progress-track">
          <span
            className={`belt-fill ${getBeltClass(currentBelt)}`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="progress-detail">
          {student.checkinsForCurrentGrau} de {student.requiredCheckins || '...'} check-ins
          {student.requiredCheckins > 0 ? ` para o grau ${currentGrau + 1}` : ''}.
          {student.requiredCheckins === 0 && ' Regra de graduacao ainda nao configurada.'}
        </p>
      </div>

      <div className="card belt-path-card">
        <h2>Caminho de faixas</h2>
        <div className="belt-path">
          {beltPath.map((belt, index) => {
            const isCurrent = belt === currentBelt
            const isPast = index < currentIndex
            return (
              <div
                key={belt}
                className={`belt-path-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
              >
                <span className={`belt-dot ${getBeltClass(belt)}`} aria-hidden="true" />
                <span className="belt-label">{belt}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PromotionModal({
  belts,
  onClose,
  onSubmit,
  student
}: {
  belts: BjjBeltOption[]
  onClose: () => void
  onSubmit: (request: GraduationPromotionRequest) => void
  student: GraduationStudentRecord
}) {
  const beltPath = getBeltPath(student.belt_audience)
  const currentBeltIndex = beltPath.indexOf(student.belt_name)
  const nextBelt = currentBeltIndex >= 0 && currentBeltIndex < beltPath.length - 1
    ? beltPath[currentBeltIndex + 1]
    : null

  const nextBeltOption = nextBelt
    ? belts.find((b) => b.name === nextBelt && b.audience === student.belt_audience)
    : null

  const currentBeltOption = belts.find((b) => b.id === student.belt_id)
  const maxGrau = currentBeltOption?.max_grau ?? 4
  const canPromoteGrau = student.grau < maxGrau

  const [newGrau, setNewGrau] = useState(student.grau + 1)
  const [newBeltId, setNewBeltId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Informe um motivo com pelo menos 3 caracteres.')
      return
    }

    if (!newBeltId && !canPromoteGrau) {
      setError('Selecione uma nova faixa ou grau.')
      return
    }

    setIsSubmitting(true)
    onSubmit({
      newBeltId: newBeltId || null,
      newGrau,
      reason: reason.trim(),
      studentId: student.id
    })
  }, [canPromoteGrau, isSubmitting, newBeltId, newGrau, reason, student.id, onSubmit])

  const targetBeltLabel = newBeltId
    ? belts.find((b) => b.id === newBeltId)?.name ?? student.belt_name
    : student.belt_name
  const targetGrauLabel = newBeltId ? 1 : newGrau

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Promover {student.full_name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>

        <div className="modal-body">
          <p className="promotion-summary">
            Promover de <strong>{formatBeltAndGrau(student.belt_name, student.grau)}</strong>
            {' '}para{' '}
            <strong>{formatBeltAndGrau(targetBeltLabel as BjjBelt, targetGrauLabel)}</strong>
          </p>

          {nextBeltOption && (
            <div className="form-group">
              <label htmlFor="new-belt">Nova faixa (opcional)</label>
              <select
                id="new-belt"
                value={newBeltId}
                onChange={(e) => {
                  setNewBeltId(e.target.value)
                  if (e.target.value) {
                    setNewGrau(1)
                  }
                }}
              >
                <option value="">Manter faixa atual</option>
                <option value={nextBeltOption.id}>{nextBeltOption.name}</option>
              </select>
            </div>
          )}

          {!newBeltId && canPromoteGrau && (
            <div className="form-group">
              <label htmlFor="new-grau">Novo grau</label>
              <select
                id="new-grau"
                value={newGrau}
                onChange={(e) => setNewGrau(Number(e.target.value))}
              >
                {Array.from({ length: 4 - student.grau }, (_, i) => student.grau + i + 1).map((g) => (
                  <option key={g} value={g}>
                    {g} grau{g === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="promotion-reason">Motivo da promocao *</label>
            <textarea
              id="promotion-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              rows={3}
              placeholder="Descreva o motivo da promocao..."
            />
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Processando...' : 'Confirmar Promocao'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function AdminGraduationView() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [filterBelt, setFilterBelt] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [promotingStudent, setPromotingStudent] = useState<GraduationStudentRecord | null>(null)

  const academyId: string | undefined = profile?.academyId ?? undefined

  const { data: students, isLoading: loadingStudents, error: studentsError } = useQuery({
    queryKey: ['graduation-students', academyId],
    queryFn: () => fetchGraduationStudents(supabase, academyId),
    enabled: !!academyId
  })

  const { data: belts, isLoading: loadingBelts } = useQuery({
    queryKey: ['bjj-belts'],
    queryFn: () => fetchBjjBelts(supabase),
    enabled: !!academyId
  })

  const promoteMutation = useMutation({
    mutationFn: (request: GraduationPromotionRequest) =>
      promoteStudent({
        academyId: academyId!,
        client: supabase,
        newBeltId: request.newBeltId,
        newGrau: request.newGrau,
        reason: request.reason,
        studentId: request.studentId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduation-students', academyId] })
      setPromotingStudent(null)
    }
  })

  const filteredStudents = useMemo(() => {
    if (!students) return []
    return students.filter((student) => {
      const matchesBelt = filterBelt === 'all' || student.belt_name.toLowerCase() === filterBelt.toLowerCase()
      const matchesSearch = searchQuery === '' ||
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesBelt && matchesSearch
    })
  }, [students, filterBelt, searchQuery])

  const availableBelts = useMemo(() => {
    if (!students) return []
    const beltNames = new Set(students.map((s) => s.belt_name))
    return Array.from(beltNames).sort()
  }, [students])

  if (loadingStudents || loadingBelts) {
    return <LoadingState title="Carregando graduacao" description="Buscando dados de graduacao dos alunos." />
  }

  if (studentsError) {
    return (
      <ErrorState
        title="Erro ao carregar graduacao"
        description="Nao foi possivel carregar os dados de graduacao. Tente novamente."
        action={<Button onClick={() => queryClient.invalidateQueries({ queryKey: ['graduation-students', academyId] })}>Tentar novamente</Button>}
      />
    )
  }

  if (!students || students.length === 0) {
    return (
      <EmptyState
        title="Sem alunos ativos"
        description="Nenhum aluno ativo encontrado para exibir a graduacao."
      />
    )
  }

  return (
    <section className="graduation-admin-view">
      <div className="graduation-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar aluno por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="belt-filter"
          value={filterBelt}
          onChange={(e) => setFilterBelt(e.target.value)}
        >
          <option value="all">Todas as faixas</option>
          {availableBelts.map((belt) => (
            <option key={belt} value={belt.toLowerCase()}>{belt}</option>
          ))}
        </select>
      </div>

      <div className="student-list">
        {filteredStudents.length === 0 ? (
          <EmptyState
            title="Nenhum aluno encontrado"
            description="Nenhum aluno corresponde aos filtros selecionados."
          />
        ) : (
          filteredStudents.map((student) => (
            <article key={student.id} className="card graduation-student-card">
              <div className="student-info">
                <div className="student-belt">
                  <span className={`belt-bar ${getBeltClass(student.belt_name)}`} aria-hidden="true" />
                  <span className="student-name">{student.full_name}</span>
                </div>
                <p className="student-grade">{formatBeltAndGrau(student.belt_name, student.grau)}</p>
              </div>

              <div className="student-progress">
                <div className="checkin-count">
                  <span className="checkin-number">{student.checkinsForCurrentGrau}</span>
                  <span className="checkin-label">check-ins</span>
                </div>
                {student.requiredCheckins > 0 && (
                  <div className="readiness">
                    {student.isReady ? (
                      <span className="ready-badge" title="Pronto para promocao">
                        &#10003; Pronto
                      </span>
                    ) : (
                      <span className="not-ready-badge" title="Ainda nao atingiu o minimo de check-ins">
                        &#9203; Falta {student.requiredCheckins - student.checkinsForCurrentGrau}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="accent"
                onClick={() => setPromotingStudent(student)}
              >
                Promover
              </Button>
            </article>
          ))
        )}
      </div>

      {promotingStudent && belts && (
        <PromotionModal
          key={promotingStudent.id}
          belts={belts}
          student={promotingStudent}
          onClose={() => setPromotingStudent(null)}
          onSubmit={(request) => promoteMutation.mutate(request)}
        />
      )}

      {promoteMutation.isPending && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="loading-modal">
              <div className="loading-spinner" aria-hidden="true" />
              <h2>Processando promocao</h2>
              <p>Aguarde enquanto registramos a graduacao do aluno...</p>
            </div>
          </div>
        </div>
      )}

      {promoteMutation.error && (
        <div className="modal-backdrop" onClick={() => promoteMutation.reset()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Erro na promocao</h2>
              <button className="modal-close" onClick={() => promoteMutation.reset()}>&times;</button>
            </div>
            <div className="modal-body">
              <p>{promoteMutation.error.message}</p>
            </div>
            <div className="modal-footer">
              <Button onClick={() => promoteMutation.reset()}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function GraduationPage() {
  const { profile } = useAuth()
  const role = profile?.role

  const isAdmin = role === 'academy_admin' || role === 'academy_staff'

  return (
    <section>
      <PageHeader
        eyebrow="Graduacao"
        title="Faixa, grau e progresso"
        description="Check-ins informam progresso, mas toda promocao de grau ou faixa continua manual pela academia."
      />

      {isAdmin ? <AdminGraduationView /> : <StudentGraduationViewWrapper />}
    </section>
  )
}

function StudentGraduationViewWrapper() {
  const { profile } = useAuth()
  const academyId: string | undefined = profile?.academyId ?? undefined

  const { data: students, isLoading, error } = useQuery({
    queryKey: ['graduation-students', academyId],
    queryFn: () => fetchGraduationStudents(supabase, academyId),
    enabled: !!academyId
  })

  if (isLoading) {
    return <LoadingState title="Carregando graduacao" description="Buscando dados de graduacao." />
  }

  if (error || !students || students.length === 0) {
    return (
      <EmptyState
        title="Graduacao indisponivel"
        description="Nao foi possivel carregar seus dados de graduacao. Contate a academia."
      />
    )
  }

  const currentStudent = students[0]

  return <StudentGraduationView student={currentStudent} />
}

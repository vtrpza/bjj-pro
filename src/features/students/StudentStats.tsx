import type { StudentRecord } from '../../shared/domain/academy'
import { isDateBeforeToday } from '../../shared/domain/academy'

type StudentStatsProps = {
  students: StudentRecord[]
}

export function StudentStats({ students }: StudentStatsProps) {
  const total = students.length
  const active = students.filter((s) => s.status === 'active').length
  const inactive = students.filter((s) => s.status === 'inactive').length
  const overdue = students.filter(
    (s) => s.status === 'active' && isDateBeforeToday(s.next_due_date)
  ).length

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span>Total de alunos</span>
        <strong>{total}</strong>
        <small>Cadastrados na academia</small>
      </div>
      <div className="stat-card">
        <span>Ativos</span>
        <strong style={{ color: 'var(--c-success)' }}>{active}</strong>
        <small>Treinando regularmente</small>
      </div>
      <div className="stat-card">
        <span>Inativos</span>
        <strong style={{ color: 'var(--c-text-dim)' }}>{inactive}</strong>
        <small>Sem acesso atual</small>
      </div>
      <div className="stat-card danger">
        <span>Mensalidades vencidas</span>
        <strong style={{ color: 'var(--c-danger)' }}>{overdue}</strong>
        <small>Precisam de atencao</small>
      </div>
    </div>
  )
}

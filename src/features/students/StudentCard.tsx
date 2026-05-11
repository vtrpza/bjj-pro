import { useState } from 'react'
import { Button } from '../../shared/components/Button'
import type { StudentRecord } from '../../shared/domain/academy'
import { getBeltClass, isDateBeforeToday } from '../../shared/domain/academy'
import { maskPhone } from '../../shared/lib/masks'

type StudentCardProps = {
  student: StudentRecord
  onEdit: (student: StudentRecord) => void
  onToggleStatus: (student: StudentRecord) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function getPaymentBadge(student: StudentRecord): { label: string; variant: 'success' | 'warn' | 'danger' | 'neutral' } {
  if (!student.next_due_date) {
    return { label: 'Sem vencimento', variant: 'neutral' }
  }
  if (isDateBeforeToday(student.next_due_date)) {
    return { label: 'Vencido', variant: 'danger' }
  }
  const today = new Date()
  const due = new Date(`${student.next_due_date}T00:00:00`)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) {
    return { label: `Vence em ${diffDays}d`, variant: 'warn' }
  }
  return { label: 'Em dia', variant: 'success' }
}

export function StudentCard({ student, onEdit, onToggleStatus }: StudentCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const paymentBadge = getPaymentBadge(student)
  const beltClass = getBeltClass(student.belt_name)

  return (
    <article className="student-card">
      <div className="student-card-main">
        <div className="student-avatar">{getInitials(student.full_name)}</div>
        <div className="student-info">
          <div className="student-name-row">
            <strong className="student-name">{student.full_name}</strong>
            <span className={`status-badge ${student.status}`}>
              {student.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div className="student-belt-row">
            <span className={`belt-bar ${beltClass}`}></span>
            <span className="belt-text">
              {student.belt_name} · {student.grau} grau{student.grau === 1 ? '' : 's'}
            </span>
          </div>
          <div className="student-meta-row">
            {student.phone ? <span>{maskPhone(student.phone)}</span> : null}
            {student.email ? <span className="student-email">{student.email}</span> : null}
            <span className={`payment-badge ${paymentBadge.variant}`}>{paymentBadge.label}</span>
          </div>
        </div>
      </div>

      <div className="student-card-actions">
        {isConfirming ? (
          <div className="confirm-actions">
            <span className="confirm-text">
              {student.status === 'active' ? 'Desativar aluno?' : 'Reativar aluno?'}
            </span>
            <Button onClick={() => { onToggleStatus(student); setIsConfirming(false) }} variant="secondary">
              Sim
            </Button>
            <Button onClick={() => setIsConfirming(false)} variant="secondary">
              Nao
            </Button>
          </div>
        ) : (
          <>
            <Button onClick={() => onEdit(student)} variant="secondary">
              Editar
            </Button>
            <Button
              onClick={() => setIsConfirming(true)}
              variant="secondary"
            >
              {student.status === 'active' ? 'Desativar' : 'Ativar'}
            </Button>
          </>
        )}
      </div>
    </article>
  )
}

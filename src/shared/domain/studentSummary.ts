import { z } from 'zod'
import type { BjjBelt, PaymentRecord, StudentRecord } from './academy'
import { formatCurrency, getPaymentStatusLabel, isDateBeforeToday } from './academy'

export type StudentPaymentRecord = PaymentRecord & {
  student_id: string
  pix_copy_paste?: string | null
  pix_qr_code_payload?: string | null
}

export type StudentCheckinRecord = {
  id: string
  academy_id: string
  student_id: string
  checked_in_at: string
  status: string | null
}

export type GraduationRuleRecord = {
  id: string
  academy_id: string | null
  belt_id: string
  grau: number
  required_checkins: number
  minimum_days: number
  active: boolean
}

export type StudentSummary = {
  beltLabel: string
  checkinsCount: number
  nextDueDateLabel: string
  paymentDetail: string
  paymentStatus: 'paid' | 'overdue' | 'pending' | 'cancelled'
  paymentStatusLabel: string
  progressDetail: string
  progressPercent: number
}

export const studentProfileSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo.'),
  phone: z.string().trim().max(32, 'Telefone muito longo.').or(z.literal(''))
})

export type StudentProfileFormValues = z.infer<typeof studentProfileSchema>

export function formatBeltAndGrau(beltName: BjjBelt, grau: number) {
  return `Faixa ${beltName.toLowerCase()}, ${grau} grau${grau === 1 ? '' : 's'}`
}

export function selectCurrentMensalidade(payments: StudentPaymentRecord[]) {
  const openPayments = payments
    .filter((payment) => payment.status !== 'paid' && payment.status !== 'cancelled')
    .sort((left, right) => String(left.due_date).localeCompare(String(right.due_date)))

  return openPayments[0] ?? payments[0] ?? null
}

export function resolveStudentPaymentStatus({
  payment,
  student,
  today = new Date()
}: {
  payment: StudentPaymentRecord | null
  student: StudentRecord
  today?: Date
}): StudentSummary['paymentStatus'] {
  if (payment?.status === 'paid') {
    return 'paid'
  }

  if (payment?.status === 'cancelled') {
    return 'cancelled'
  }

  if (payment?.status === 'overdue' || isDateBeforeToday(payment?.due_date ?? student.next_due_date, today)) {
    return 'overdue'
  }

  return 'pending'
}

export function calculateGraduationProgress({
  checkins,
  currentGrau,
  rules
}: {
  checkins: StudentCheckinRecord[]
  currentGrau: number
  rules: GraduationRuleRecord[]
}) {
  const validCheckins = checkins.filter((checkin) => checkin.status !== 'cancelled').length
  const nextRule = rules.find((rule) => rule.active && rule.grau === currentGrau + 1) ?? null

  if (!nextRule || nextRule.required_checkins <= 0) {
    return {
      checkinsCount: validCheckins,
      detail: `${validCheckins} check-in${validCheckins === 1 ? '' : 's'} validado${validCheckins === 1 ? '' : 's'}. Regra de graduacao ainda nao configurada.`,
      percent: 0
    }
  }

  const percent = Math.min(100, Math.round((validCheckins / nextRule.required_checkins) * 100))

  return {
    checkinsCount: validCheckins,
    detail: `${validCheckins} de ${nextRule.required_checkins} check-ins para o proximo grau. Promocao continua manual pela academia.`,
    percent
  }
}

export function buildStudentSummary({
  checkins,
  payments,
  rules,
  student,
  today = new Date()
}: {
  checkins: StudentCheckinRecord[]
  payments: StudentPaymentRecord[]
  rules: GraduationRuleRecord[]
  student: StudentRecord
  today?: Date
}): StudentSummary {
  const currentPayment = selectCurrentMensalidade(payments)
  const paymentStatus = resolveStudentPaymentStatus({ payment: currentPayment, student, today })
  const progress = calculateGraduationProgress({ checkins, currentGrau: student.grau, rules })
  const dueDate = currentPayment?.due_date ?? student.next_due_date
  const amount = currentPayment?.amount ? ` de ${formatCurrency(currentPayment.amount)}` : ''

  return {
    beltLabel: formatBeltAndGrau(student.belt_name, student.grau),
    checkinsCount: progress.checkinsCount,
    nextDueDateLabel: dueDate ?? 'Sem vencimento cadastrado',
    paymentDetail: dueDate ? `Mensalidade${amount} com vencimento em ${dueDate}` : 'Mensalidade sem cobranca Pix aberta.',
    paymentStatus,
    paymentStatusLabel: getPaymentStatusLabel(paymentStatus),
    progressDetail: progress.detail,
    progressPercent: progress.percent
  }
}

export function toStudentProfilePayload(values: StudentProfileFormValues) {
  return {
    full_name: values.fullName.trim(),
    phone: values.phone.trim() || null
  }
}

export type PixPaymentResponse = {
  paymentId: string
  pixQrCodePayload: string
  pixCopyPaste: string
  amount: number
  dueDate: string
  status: string
}

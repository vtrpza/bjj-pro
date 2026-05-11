import { z } from 'zod'

export type StudentStatus = 'active' | 'inactive'

export type PaymentStatus = 'pending' | 'overdue' | 'paid' | 'cancelled'

export type BjjBelt = 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde'

export type BjjBeltOption = {
  id: string
  audience: 'adult' | 'kids'
  name: BjjBelt
  rank: number
  max_grau: number
}

export type StudentRecord = {
  id: string
  academy_id: string
  full_name: string
  email: string | null
  phone: string | null
  belt_id: string
  belt_name: BjjBelt
  belt_audience: 'adult' | 'kids'
  grau: number
  next_due_date: string | null
  status: StudentStatus
  created_at?: string
}

export type PaymentRecord = {
  id: string
  academy_id: string
  amount: number | null
  status: PaymentStatus | string | null
  due_date: string | null
  paid_at: string | null
}

export type CheckinRecord = {
  id: string
  academy_id: string
  created_at: string
}

export type TimePeriod = {
  start: string
  end: string
}

export type AcademyOpeningHours = {
  monday: TimePeriod[]
  tuesday: TimePeriod[]
  wednesday: TimePeriod[]
  thursday: TimePeriod[]
  friday: TimePeriod[]
  saturday: TimePeriod[]
  sunday: TimePeriod[]
}

export type AcademySettings = {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
  email: string | null
  phone: string | null
  address: string | null
  checkins_per_grau: number | null
  opening_hours: AcademyOpeningHours | null
}

export type DashboardMetrics = {
  activeStudents: number
  overdueMensalidades: number
  todayCheckins: number
  openPixPayments: number
  monthlyRevenue: number
}

export const beltOptions: BjjBelt[] = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Cinza', 'Amarela', 'Laranja', 'Verde']

export const ADULT_BELT_PATH: BjjBelt[] = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta']
export const KIDS_BELT_PATH: BjjBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde']

export const BELT_COLOR_MAP: Record<BjjBelt, string> = {
  Branca: '#f8f8f8',
  Azul: '#0033a0',
  Roxa: '#6a0dad',
  Marrom: '#6b3e1b',
  Preta: '#111111',
  Cinza: '#808080',
  Amarela: '#ffd700',
  Laranja: '#ff8c00',
  Verde: '#228b22'
}

export type GraduationStudentRecord = StudentRecord & {
  checkinsForCurrentGrau: number
  requiredCheckins: number
  isReady: boolean
}

export type GraduationPromotionRequest = {
  studentId: string
  newBeltId: string | null
  newGrau: number
  reason: string
}

export type GraduationPromotionResponse = {
  success: boolean
  studentId: string
  newBeltId: string | null
  newGrau: number
}

export function getNextBeltInPath(currentBelt: BjjBelt, audience: 'adult' | 'kids'): BjjBelt | null {
  const path = audience === 'adult' ? ADULT_BELT_PATH : KIDS_BELT_PATH
  const currentIndex = path.indexOf(currentBelt)
  if (currentIndex < 0 || currentIndex >= path.length - 1) {
    return null
  }
  return path[currentIndex + 1]
}

export function getBeltClass(belt: BjjBelt): string {
  return `belt-${belt.toLowerCase()}`
}

export const studentFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Informe o nome do aluno.')
    .max(120, 'Nome muito longo.')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome deve conter apenas letras.'),
  email: z.string().trim().email('Informe um e-mail valido.').or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true
      const digits = val.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 11
    }, 'Informe um telefone valido com DDD.')
    .or(z.literal('')),
  beltId: z.string().trim().min(1, 'Selecione a faixa do aluno.'),
  grau: z.number().int().min(0, 'Grau minimo e 0.').max(4, 'Grau maximo e 4.'),
  mensalidadeDueDate: z.string().or(z.literal('')),
  status: z.enum(['active', 'inactive'])
})

export const timePeriodSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use formato HH:MM para inicio.'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use formato HH:MM para fim.')
}).refine((data) => data.start < data.end, {
  message: 'Horario de fim deve ser apos o inicio.'
})

export const openingHoursSchema = z.object({
  monday: z.array(timePeriodSchema),
  tuesday: z.array(timePeriodSchema),
  wednesday: z.array(timePeriodSchema),
  thursday: z.array(timePeriodSchema),
  friday: z.array(timePeriodSchema),
  saturday: z.array(timePeriodSchema),
  sunday: z.array(timePeriodSchema)
})

export const academySettingsSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome da academia.'),
  logoUrl: z.string().trim().url('Informe uma URL valida.').or(z.literal('')),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #000000.'),
  contactEmail: z.string().trim().email('Informe um e-mail valido.').or(z.literal('')),
  contactPhone: z.string().trim().max(32, 'Telefone muito longo.').or(z.literal('')),
  address: z.string().trim().max(180, 'Endereco muito longo.').or(z.literal('')),
  checkinsPerGrau: z.string().trim().refine((val) => {
    const num = Number(val)
    return Number.isInteger(num) && num >= 1 && num <= 30
  }, { message: 'Informe um numero entre 1 e 30.' }),
  openingHours: openingHoursSchema
})

export type StudentFormValues = z.infer<typeof studentFormSchema>

export type AcademySettingsFormValues = z.infer<typeof academySettingsSchema>

export type CheckinStatus = 'valid' | 'cancelled'

export type CheckinSource = 'qr' | 'manual' | 'correction'

export type CheckinReviewRecord = {
  id: string
  academy_id: string
  student_id: string
  student_name: string
  training_session_id: string
  source: CheckinSource
  checked_in_at: string
  status: CheckinStatus
}

export type CheckinCorrectionRequest = {
  checkinId: string
  reason: string
}

export type CheckinCorrectionResponse = {
  success: boolean
  checkinId: string
  reason: string
}

export type TrainingSessionRecord = {
  id: string
  academy_id: string
  title: string
  training_date: string
  status: string
  created_at: string
}

export function toNullableText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value)
}

export function isDateBeforeToday(value: string | null, today = new Date()) {
  if (!value) {
    return false
  }

  const dueDate = new Date(`${value}T00:00:00`)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return dueDate < startOfToday
}

export function isSameLocalDay(value: string, day = new Date()) {
  const date = new Date(value)

  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  )
}

export function isSameLocalMonth(value: string | null, month = new Date()) {
  if (!value) {
    return false
  }

  const date = new Date(value)

  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
}

export function getPaymentStatusLabel(status: string | null) {
  switch (status) {
    case 'paid':
      return 'Pago'
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Cancelado'
    default:
      return 'Pix em aberto'
  }
}

export function calculateDashboardMetrics({
  checkins,
  payments,
  students,
  today = new Date()
}: {
  checkins: CheckinRecord[]
  payments: PaymentRecord[]
  students: StudentRecord[]
  today?: Date
}): DashboardMetrics {
  const activeStudents = students.filter((student) => student.status === 'active').length
  const overdueStudentDueDates = students.filter(
    (student) => student.status === 'active' && isDateBeforeToday(student.next_due_date, today)
  ).length
  const overduePayments = payments.filter(
    (payment) => payment.status !== 'paid' && payment.status !== 'cancelled' && isDateBeforeToday(payment.due_date, today)
  ).length

  return {
    activeStudents,
    overdueMensalidades: Math.max(overdueStudentDueDates, overduePayments),
    todayCheckins: checkins.filter((checkin) => isSameLocalDay(checkin.created_at, today)).length,
    openPixPayments: payments.filter((payment) => payment.status !== 'paid' && payment.status !== 'cancelled').length,
    monthlyRevenue: payments
      .filter((payment) => payment.status === 'paid' && isSameLocalMonth(payment.paid_at, today))
      .reduce((total, payment) => total + (payment.amount ?? 0), 0)
  }
}

export function toStudentPayload(values: StudentFormValues, academyId: string) {
  return {
    academy_id: academyId,
    belt_id: values.beltId,
    full_name: values.fullName.trim(),
    email: toNullableText(values.email),
    grau: values.grau,
    next_due_date: toNullableText(values.mensalidadeDueDate),
    phone: toNullableText(values.phone),
    status: values.status
  }
}

export function toAcademySettingsPayload(values: AcademySettingsFormValues) {
  return {
    name: values.name.trim(),
    logo_url: toNullableText(values.logoUrl),
    primary_color: values.primaryColor,
    email: toNullableText(values.contactEmail),
    phone: toNullableText(values.contactPhone),
    address: toNullableText(values.address),
    checkins_per_grau: Number(values.checkinsPerGrau),
    opening_hours: values.openingHours
  }
}

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const

export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terca-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sabado',
  sunday: 'Domingo'
}

export const SHORT_DAY_LABELS: Record<DayKey, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sab',
  sunday: 'Dom'
}

export function getDayKeyFromDate(date = new Date()): DayKey {
  const dayIndex = date.getDay()
  const mapping: DayKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ]
  return mapping[dayIndex]
}

export function getTodaySchedule(
  openingHours: AcademyOpeningHours | null | undefined
): TimePeriod[] {
  if (!openingHours) return []
  return openingHours[getDayKeyFromDate()]
}

export function isCurrentlyInPeriod(period: TimePeriod, now = new Date()): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = period.start.split(':').map(Number)
  const [endH, endM] = period.end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export function getCurrentPeriod(
  periods: TimePeriod[],
  now = new Date()
): TimePeriod | null {
  return periods.find((p) => isCurrentlyInPeriod(p, now)) ?? null
}

export function getNextPeriod(
  periods: TimePeriod[],
  now = new Date()
): TimePeriod | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start))
  return sorted.find((p) => {
    const [h, m] = p.start.split(':').map(Number)
    return h * 60 + m > currentMinutes
  }) ?? null
}

export function formatPeriod(period: TimePeriod): string {
  return `${period.start} - ${period.end}`
}

export function getEmptyOpeningHours(): AcademyOpeningHours {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  }
}

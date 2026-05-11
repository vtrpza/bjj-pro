import { describe, expect, it } from 'vitest'
import {
  academySettingsSchema,
  calculateDashboardMetrics,
  getCurrentPeriod,
  getDayKeyFromDate,
  getEmptyOpeningHours,
  getNextPeriod,
  getPaymentStatusLabel,
  getTodaySchedule,
  isDateBeforeToday,
  studentFormSchema,
  toAcademySettingsPayload,
  toStudentPayload
} from './academy'
import type { CheckinRecord, PaymentRecord, StudentRecord } from './academy'

const academyId = 'academy-1'

const students: StudentRecord[] = [
  {
    id: 'student-1',
    academy_id: academyId,
    belt_audience: 'adult',
    belt_id: 'belt-branca',
    belt_name: 'Branca',
    email: null,
    full_name: 'Ana Faixa Branca',
    grau: 1,
    next_due_date: '2026-04-01',
    phone: null,
    status: 'active'
  },
  {
    id: 'student-2',
    academy_id: academyId,
    belt_audience: 'adult',
    belt_id: 'belt-azul',
    belt_name: 'Azul',
    email: null,
    full_name: 'Bruno Faixa Azul',
    grau: 2,
    next_due_date: '2026-05-10',
    phone: null,
    status: 'active'
  },
  {
    id: 'student-3',
    academy_id: academyId,
    belt_audience: 'adult',
    belt_id: 'belt-roxa',
    belt_name: 'Roxa',
    email: null,
    full_name: 'Carla Inativa',
    grau: 0,
    next_due_date: '2026-03-10',
    phone: null,
    status: 'inactive'
  }
]

const payments: PaymentRecord[] = [
  {
    id: 'payment-1',
    academy_id: academyId,
    amount: 180,
    due_date: '2026-04-05',
    paid_at: '2026-04-12T12:00:00Z',
    status: 'paid'
  },
  {
    id: 'payment-2',
    academy_id: academyId,
    amount: 190,
    due_date: '2026-04-08',
    paid_at: null,
    status: 'pending'
  }
]

const checkins: CheckinRecord[] = [
  { id: 'checkin-1', academy_id: academyId, created_at: '2026-04-24T09:00:00' },
  { id: 'checkin-2', academy_id: academyId, created_at: '2026-04-23T09:00:00' }
]

describe('calculateDashboardMetrics', () => {
  it('calcula indicadores do painel da academia a partir de alunos, mensalidades e check-ins', () => {
    expect(
      calculateDashboardMetrics({ checkins, payments, students, today: new Date('2026-04-24T15:00:00') })
    ).toEqual({
      activeStudents: 2,
      monthlyRevenue: 180,
      openPixPayments: 1,
      overdueMensalidades: 1,
      todayCheckins: 1
    })
  })
})

describe('status de mensalidade', () => {
  it('identifica vencimento antes do dia atual local', () => {
    expect(isDateBeforeToday('2026-04-23', new Date('2026-04-24T12:00:00'))).toBe(true)
    expect(isDateBeforeToday('2026-04-24', new Date('2026-04-24T12:00:00'))).toBe(false)
  })

  it('traduz estados Pix para copia em portugues', () => {
    expect(getPaymentStatusLabel('paid')).toBe('Pago')
    expect(getPaymentStatusLabel('pending')).toBe('Pix em aberto')
  })
})

describe('validacao de formularios', () => {
  it('normaliza payload de aluno para colunas do Supabase', () => {
    const values = studentFormSchema.parse({
      beltId: 'belt-branca',
      email: '',
      fullName: '  Joao Silva  ',
      grau: 2,
      mensalidadeDueDate: '2026-05-10',
      phone: '',
      status: 'active'
    })

    expect(toStudentPayload(values, academyId)).toMatchObject({
      academy_id: academyId,
      belt_id: 'belt-branca',
      email: null,
      full_name: 'Joao Silva',
      grau: 2,
      next_due_date: '2026-05-10',
      phone: null
    })
  })

  it('valida e normaliza configuracoes da academia', () => {
    const values = academySettingsSchema.parse({
      address: '',
      checkinsPerGrau: '8',
      contactEmail: 'contato@academia.com',
      contactPhone: '',
      logoUrl: '',
      name: 'Alpha Force Jiu-Jitsu',
      openingHours: getEmptyOpeningHours(),
      primaryColor: '#111111'
    })

    expect(toAcademySettingsPayload(values)).toMatchObject({
      checkins_per_grau: 8,
      phone: null,
      logo_url: null,
      name: 'Alpha Force Jiu-Jitsu',
      primary_color: '#111111',
      opening_hours: getEmptyOpeningHours()
    })
  })

  it('rejeita horarios invalidos de aula', () => {
    const invalid = {
      address: '',
      checkinsPerGrau: '8',
      contactEmail: '',
      contactPhone: '',
      logoUrl: '',
      name: 'Test',
      openingHours: {
        ...getEmptyOpeningHours(),
        monday: [{ start: '25:00', end: '26:00' }]
      },
      primaryColor: '#000000'
    }

    expect(() => academySettingsSchema.parse(invalid)).toThrow()
  })

  it('rejeita periodo com fim antes do inicio', () => {
    const invalid = {
      address: '',
      checkinsPerGrau: '8',
      contactEmail: '',
      contactPhone: '',
      logoUrl: '',
      name: 'Test',
      openingHours: {
        ...getEmptyOpeningHours(),
        monday: [{ start: '20:00', end: '14:00' }]
      },
      primaryColor: '#000000'
    }

    expect(() => academySettingsSchema.parse(invalid)).toThrow()
  })
})

describe('horarios de aula', () => {
  it('retorna horarios do dia atual', () => {
    const hours = {
      ...getEmptyOpeningHours(),
      monday: [{ start: '06:00', end: '07:30' }]
    }

    const monday = new Date('2026-05-11T12:00:00') // Monday
    expect(getDayKeyFromDate(monday)).toBe('monday')
    expect(getTodaySchedule(hours)).toEqual([{ start: '06:00', end: '07:30' }])
  })

  it('identifica periodo atual', () => {
    const period = { start: '14:00', end: '15:30' }
    expect(getCurrentPeriod([period], new Date('2026-05-11T14:30:00'))).toEqual(period)
    expect(getCurrentPeriod([period], new Date('2026-05-11T16:00:00'))).toBeNull()
  })

  it('encontra proximo periodo', () => {
    const periods = [
      { start: '06:00', end: '07:30' },
      { start: '20:00', end: '21:30' }
    ]
    expect(getNextPeriod(periods, new Date('2026-05-11T12:00:00'))).toEqual({ start: '20:00', end: '21:30' })
    expect(getNextPeriod(periods, new Date('2026-05-11T22:00:00'))).toBeNull()
  })
})

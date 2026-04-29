import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AcademySettings,
  BjjBeltOption,
  CheckinRecord,
  CheckinReviewRecord,
  GraduationPromotionResponse,
  GraduationStudentRecord,
  PaymentRecord,
  StudentRecord,
  TrainingSessionRecord
} from '../domain/academy'
import { toAcademySettingsPayload, toStudentPayload } from '../domain/academy'
import type { AcademySettingsFormValues, StudentFormValues } from '../domain/academy'
import type { GraduationRuleRecord } from '../domain/studentSummary'

function assertSupabase(client: SupabaseClient | null): asserts client is SupabaseClient {
  if (!client) {
    throw new Error('Supabase nao esta configurado.')
  }
}

function assertAcademyId(academyId: string | undefined): asserts academyId is string {
  if (!academyId) {
    throw new Error('Contexto da academia nao encontrado.')
  }
}

export async function fetchStudents(client: SupabaseClient | null, academyId: string | undefined) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client
    .from('students')
    .select('id, academy_id, full_name, email, phone, belt_id, grau, next_due_date, status, created_at, bjj_belts(id, audience, name, rank, max_grau)')
    .eq('academy_id', academyId)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map(toStudentRecord)
}

export async function fetchBjjBelts(client: SupabaseClient | null) {
  assertSupabase(client)

  const { data, error } = await client
    .from('bjj_belts')
    .select('id, audience, name, rank, max_grau')
    .order('audience', { ascending: true })
    .order('rank', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as BjjBeltOption[]
}

export async function saveStudent({
  academyId,
  client,
  studentId,
  values
}: {
  academyId: string | undefined
  client: SupabaseClient | null
  studentId?: string
  values: StudentFormValues
}) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const payload = toStudentPayload(values, academyId)
  const request = studentId
    ? client.from('students').update(payload).eq('id', studentId).eq('academy_id', academyId)
    : client.from('students').insert(payload)
  const { error } = await request

  if (error) {
    throw error
  }
}

export async function fetchDashboardData(client: SupabaseClient | null, academyId: string | undefined) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const [studentsResult, paymentsResult, checkinsResult] = await Promise.all([
    client
      .from('students')
      .select('id, academy_id, full_name, email, phone, belt_id, grau, next_due_date, status, bjj_belts(id, audience, name, rank, max_grau)')
      .eq('academy_id', academyId),
    client.from('payments').select('id, academy_id, amount, status, due_date, paid_at').eq('academy_id', academyId),
    client.from('checkins').select('id, academy_id, created_at').eq('academy_id', academyId)
  ])

  const error = studentsResult.error ?? paymentsResult.error ?? checkinsResult.error

  if (error) {
    throw error
  }

  return {
    checkins: (checkinsResult.data ?? []) as CheckinRecord[],
    payments: (paymentsResult.data ?? []) as PaymentRecord[],
    students: (studentsResult.data ?? []).map(toStudentRecord)
  }
}

export async function fetchAcademySettings(client: SupabaseClient | null, academyId: string | undefined) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client
    .from('academies')
    .select('id, name, logo_url, primary_color, email, phone, address, checkins_per_grau')
    .eq('id', academyId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as AcademySettings | null
}

export async function updateAcademySettings({
  academyId,
  client,
  values
}: {
  academyId: string | undefined
  client: SupabaseClient | null
  values: AcademySettingsFormValues
}) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { error } = await client.from('academies').update(toAcademySettingsPayload(values)).eq('id', academyId)

  if (error) {
    throw error
  }
}

type StudentRow = {
  id: string
  academy_id: string
  full_name: string
  email: string | null
  phone: string | null
  belt_id: string
  grau: number
  next_due_date: string | null
  status: StudentRecord['status']
  created_at?: string
  bjj_belts: BjjBeltOption | BjjBeltOption[] | null
}

function toStudentRecord(row: StudentRow): StudentRecord {
  const belt = Array.isArray(row.bjj_belts) ? row.bjj_belts[0] : row.bjj_belts

  return {
    academy_id: row.academy_id,
    belt_audience: belt?.audience ?? 'adult',
    belt_id: row.belt_id,
    belt_name: belt?.name ?? 'Branca',
    created_at: row.created_at,
    email: row.email,
    full_name: row.full_name,
    grau: row.grau,
    id: row.id,
    next_due_date: row.next_due_date,
    phone: row.phone,
    status: row.status
  }
}

export type AdminPaymentRow = {
  id: string
  academy_id: string
  student_id: string
  amount: number | null
  status: string | null
  due_date: string | null
  paid_at: string | null
  pix_copy_paste: string | null
  pix_qr_code_payload: string | null
  asaas_payment_id: string | null
  created_at: string
  students: { full_name: string }[] | { full_name: string } | null
}

export async function fetchAdminPayments(client: SupabaseClient | null, academyId: string | undefined) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client
    .from('payments')
    .select('id, academy_id, student_id, amount, status, due_date, paid_at, pix_copy_paste, pix_qr_code_payload, asaas_payment_id, created_at, students(full_name)')
    .eq('academy_id', academyId)
    .order('due_date', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students

    return {
      ...row,
      student_name: student?.full_name ?? 'Aluno removido'
    }
  })
}

export async function fetchCheckinsBySession(
  client: SupabaseClient | null,
  academyId: string | undefined,
  sessionId: string
) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client
    .from('checkins')
    .select(
      'id, academy_id, student_id, training_session_id, source, checked_in_at, status, students(full_name)'
    )
    .eq('academy_id', academyId)
    .eq('training_session_id', sessionId)
    .order('checked_in_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row: {
    id: string
    academy_id: string
    student_id: string
    training_session_id: string
    source: string
    checked_in_at: string
    status: string
    students: { full_name: string }[] | { full_name: string } | null
  }): CheckinReviewRecord => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students

    return {
      id: row.id,
      academy_id: row.academy_id,
      student_id: row.student_id,
      student_name: student?.full_name ?? 'Aluno removido',
      training_session_id: row.training_session_id,
      source: row.source as CheckinReviewRecord['source'],
      checked_in_at: row.checked_in_at,
      status: row.status as CheckinReviewRecord['status']
    }
  })
}

export async function fetchSessionDetails(
  client: SupabaseClient | null,
  academyId: string | undefined,
  sessionId: string
) {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client
    .from('training_sessions')
    .select('id, academy_id, title, training_date, status, created_at')
    .eq('id', sessionId)
    .eq('academy_id', academyId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as TrainingSessionRecord | null
}

export async function fetchGraduationStudents(
  client: SupabaseClient | null,
  academyId: string | undefined
): Promise<GraduationStudentRecord[]> {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data: studentsData, error: studentsError } = await client
    .from('students')
    .select('id, academy_id, full_name, email, phone, belt_id, grau, next_due_date, status, created_at, bjj_belts(id, audience, name, rank, max_grau)')
    .eq('academy_id', academyId)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (studentsError) {
    throw studentsError
  }

  const students = (studentsData ?? []).map(toStudentRecord)

  if (students.length === 0) {
    return []
  }

  const studentIds = students.map((s) => s.id)
  const { data: checkinsData, error: checkinsError } = await client
    .from('checkins')
    .select('student_id')
    .eq('academy_id', academyId)
    .eq('student_id', studentIds)
    .eq('status', 'valid')

  if (checkinsError) {
    throw checkinsError
  }

  const checkinCounts = new Map<string, number>()
  for (const checkin of checkinsData ?? []) {
    const count = checkinCounts.get(checkin.student_id) ?? 0
    checkinCounts.set(checkin.student_id, count + 1)
  }

  const { data: rulesData, error: rulesError } = await client
    .from('graduation_rules')
    .select('belt_id, grau, required_checkins, active')
    .or(`academy_id.eq.${academyId},academy_id.is.null`)
    .eq('active', true)

  if (rulesError) {
    throw rulesError
  }

  const rulesMap = new Map<string, GraduationRuleRecord>()
  for (const rule of rulesData ?? []) {
    const key = `${rule.belt_id}-${rule.grau}`
    if (!rulesMap.has(key)) {
      rulesMap.set(key, rule as GraduationRuleRecord)
    }
  }

  return students.map((student) => {
    const checkinsForCurrentGrau = checkinCounts.get(student.id) ?? 0
    const nextGrauRule = rulesMap.get(`${student.belt_id}-${student.grau + 1}`)
    const requiredCheckins = nextGrauRule?.required_checkins ?? 0
    const isReady = requiredCheckins > 0 && checkinsForCurrentGrau >= requiredCheckins

    return {
      ...student,
      checkinsForCurrentGrau,
      isReady,
      requiredCheckins
    }
  })
}

export async function fetchGraduationRules(
  client: SupabaseClient | null,
  academyId: string | undefined,
  beltId: string
): Promise<GraduationRuleRecord[]> {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client
    .from('graduation_rules')
    .select('id, academy_id, belt_id, grau, required_checkins, minimum_days, active')
    .eq('belt_id', beltId)
    .eq('active', true)
    .or(`academy_id.eq.${academyId},academy_id.is.null`)
    .order('grau', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as GraduationRuleRecord[]
}

export async function promoteStudent({
  academyId,
  client,
  newBeltId,
  newGrau,
  reason,
  studentId
}: {
  academyId: string | undefined
  client: SupabaseClient | null
  newBeltId: string | null
  newGrau: number
  reason: string
  studentId: string
}): Promise<GraduationPromotionResponse> {
  assertSupabase(client)
  assertAcademyId(academyId)

  const { data, error } = await client.functions.invoke('graduation-promote', {
    body: {
      academyId,
      newBeltId,
      newGrau,
      reason,
      studentId
    }
  })

  if (error) {
    throw new Error(error.message ?? 'Erro ao promover aluno.')
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Resposta invalida do servidor.')
  }

  const response = data as Record<string, unknown>

  const success = response.success === true
  const responseStudentId = typeof response.studentId === 'string' ? response.studentId : ''
  const responseNewBeltId = typeof response.newBeltId === 'string' ? response.newBeltId : null
  const responseNewGrau = typeof response.newGrau === 'number' ? response.newGrau : 0

  if (!success || !responseStudentId) {
    throw new Error('Falha na promocao do aluno.')
  }

  return {
    newBeltId: responseNewBeltId,
    newGrau: responseNewGrau,
    studentId: responseStudentId,
    success
  }
}

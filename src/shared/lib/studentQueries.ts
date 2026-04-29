import type { SupabaseClient } from '@supabase/supabase-js'
import type { BjjBeltOption, StudentRecord } from '../domain/academy'
import type { GraduationRuleRecord, StudentCheckinRecord, StudentPaymentRecord, StudentProfileFormValues, PixPaymentResponse } from '../domain/studentSummary'
import { toStudentProfilePayload } from '../domain/studentSummary'

type ProfileRecord = {
  id: string
  full_name: string
  phone: string | null
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

export type LinkedStudentExperience = {
  checkins: StudentCheckinRecord[]
  payments: StudentPaymentRecord[]
  profile: ProfileRecord
  rules: GraduationRuleRecord[]
  student: StudentRecord | null
}

function assertSupabase(client: SupabaseClient | null): asserts client is SupabaseClient {
  if (!client) {
    throw new Error('Supabase nao esta configurado.')
  }
}

function assertProfileContext(profileId: string | undefined, academyId: string | undefined): asserts profileId is string {
  if (!profileId || !academyId) {
    throw new Error('Perfil do aluno ou academia nao encontrado.')
  }
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

export async function fetchLinkedStudentExperience({
  academyId,
  client,
  profileId
}: {
  academyId: string | undefined
  client: SupabaseClient | null
  profileId: string | undefined
}): Promise<LinkedStudentExperience> {
  assertSupabase(client)
  assertProfileContext(profileId, academyId)

  const [profileResult, studentResult] = await Promise.all([
    client.from('profiles').select('id, full_name, phone').eq('id', profileId).maybeSingle(),
    client
      .from('students')
      .select('id, academy_id, full_name, email, phone, belt_id, grau, next_due_date, status, created_at, bjj_belts(id, audience, name, rank, max_grau)')
      .eq('academy_id', academyId)
      .eq('profile_id', profileId)
      .maybeSingle()
  ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (studentResult.error) {
    throw studentResult.error
  }

  const student = studentResult.data ? toStudentRecord(studentResult.data as StudentRow) : null

  if (!profileResult.data) {
    throw new Error('Perfil nao encontrado.')
  }

  if (!student) {
    return {
      checkins: [],
      payments: [],
      profile: profileResult.data as ProfileRecord,
      rules: [],
      student: null
    }
  }

  const [paymentsResult, checkinsResult, rulesResult] = await Promise.all([
    client
      .from('payments')
      .select('id, academy_id, student_id, amount, status, due_date, paid_at, pix_copy_paste, pix_qr_code_payload')
      .eq('academy_id', academyId)
      .eq('student_id', student.id)
      .order('due_date', { ascending: false })
      .limit(12),
    client
      .from('checkins')
      .select('id, academy_id, student_id, checked_in_at, status')
      .eq('academy_id', academyId)
      .eq('student_id', student.id)
      .order('checked_in_at', { ascending: false })
      .limit(120),
    client
      .from('graduation_rules')
      .select('id, academy_id, belt_id, grau, required_checkins, minimum_days, active')
      .eq('belt_id', student.belt_id)
      .eq('active', true)
      .or(`academy_id.eq.${academyId},academy_id.is.null`)
      .order('academy_id', { ascending: false })
      .order('grau', { ascending: true })
  ])

  const error = paymentsResult.error ?? checkinsResult.error ?? rulesResult.error

  if (error) {
    throw error
  }

  return {
    checkins: (checkinsResult.data ?? []) as StudentCheckinRecord[],
    payments: (paymentsResult.data ?? []) as StudentPaymentRecord[],
    profile: profileResult.data as ProfileRecord,
    rules: (rulesResult.data ?? []) as GraduationRuleRecord[],
    student
  }
}

export async function updateStudentProfile({
  client,
  profileId,
  values
}: {
  client: SupabaseClient | null
  profileId: string | undefined
  values: StudentProfileFormValues
}) {
  assertSupabase(client)

  if (!profileId) {
    throw new Error('Perfil nao encontrado.')
  }

  const { error } = await client.from('profiles').update(toStudentProfilePayload(values)).eq('id', profileId)

  if (error) {
    throw error
  }
}

export async function fetchStudentPayments(
  client: SupabaseClient | null,
  profileId: string | undefined,
  academyId: string | undefined
): Promise<StudentPaymentRecord[]> {
  assertSupabase(client)
  assertProfileContext(profileId, academyId)

  const { data: studentData, error: studentError } = await client
    .from('students')
    .select('id')
    .eq('academy_id', academyId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (studentError) {
    throw studentError
  }

  if (!studentData) {
    return []
  }

  const { data, error } = await client
    .from('payments')
    .select('id, academy_id, student_id, amount, status, due_date, paid_at, pix_copy_paste, pix_qr_code_payload')
    .eq('student_id', studentData.id)
    .order('due_date', { ascending: false })
    .limit(12)

  if (error) {
    throw error
  }

  return (data ?? []) as StudentPaymentRecord[]
}

export async function requestPixPayment({
  client
}: {
  client: SupabaseClient | null
}): Promise<PixPaymentResponse> {
  assertSupabase(client)

  const { data, error } = await client.functions.invoke('asaas-pix-create', {
    body: {}
  })

  if (error) {
    throw new Error(error.message ?? 'Erro ao solicitar pagamento Pix.')
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Resposta invalida do servidor de pagamento.')
  }

  const response = data as Record<string, unknown>

  const paymentId = typeof response.paymentId === 'string' ? response.paymentId : ''
  const pixQrCodePayload = typeof response.pixQrCodePayload === 'string' ? response.pixQrCodePayload : ''
  const pixCopyPaste = typeof response.pixCopyPaste === 'string' ? response.pixCopyPaste : ''
  const amount = typeof response.amount === 'number' ? response.amount : 0
  const dueDate = typeof response.dueDate === 'string' ? response.dueDate : ''
  const status = typeof response.status === 'string' ? response.status : ''

  if (!paymentId || !pixQrCodePayload || !pixCopyPaste) {
    throw new Error('Dados do pagamento Pix incompletos.')
  }

  return {
    amount,
    dueDate,
    paymentId,
    pixCopyPaste,
    pixQrCodePayload,
    status
  }
}

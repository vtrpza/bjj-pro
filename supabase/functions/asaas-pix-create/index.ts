import { createServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { ApiError, assertPost, errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts'
import { requireEnv } from '../_shared/env.ts'

type AsaasCustomer = {
  id: string
  name: string
  email?: string
  phone?: string
  cpfCnpj?: string
}

type AsaasPayment = {
  id: string
  billingType: string
  value: number
  dueDate: string
  status: string
  pixTransaction?: {
    payload: string
    payloadRaw: string
  }
}

type OpenPaymentRow = {
  id: string
  academy_id: string
  student_id: string
  amount: number
  status: string
  due_date: string
  pix_copy_paste: string | null
  pix_qr_code_payload: string | null
  asaas_payment_id: string | null
}

type StudentRow = {
  id: string
  academy_id: string
  profile_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  next_due_date: string | null
  status: string
}

type ProfileRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

function getAsaasHeaders() {
  return {
    'Content-Type': 'application/json',
    'access_token': requireEnv('ASAAS_API_KEY')
  }
}

function getAsaasBaseUrl() {
  return requireEnv('ASAAS_API_URL')
}

async function asaasRequest<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const baseUrl = getAsaasBaseUrl()
  const url = `${baseUrl}${path}`

  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: getAsaasHeaders(),
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    let message = `Asaas API error: ${response.status}`
    try {
      const errorBody = await response.json()
      if (errorBody && typeof errorBody === 'object' && 'errors' in errorBody && Array.isArray(errorBody.errors)) {
        const descriptions = errorBody.errors
          .filter((e: unknown) => e && typeof e === 'object' && 'description' in e)
          .map((e: Record<string, string>) => e.description)
        if (descriptions.length > 0) {
          message = descriptions.join('. ')
        }
      }
    } catch {
      // ignore parse error, use default message
    }
    throw new ApiError(502, 'server_error', `Erro na comunicacao com Asaas: ${message}`)
  }

  return response.json() as Promise<T>
}

async function findOrCreateAsaasCustomer(
  supabase: ReturnType<typeof createServiceClient>,
  student: StudentRow,
  profile: ProfileRow | null
): Promise<string> {
  const { data: existing } = await supabase
    .from('asaas_customers')
    .select('asaas_customer_id')
    .eq('student_id', student.id)
    .eq('academy_id', student.academy_id)
    .maybeSingle()

  if (existing?.asaas_customer_id) {
    return existing.asaas_customer_id
  }

  const customerData: Record<string, string> = {
    name: student.full_name
  }

  const email = student.email ?? profile?.email
  if (email) {
    customerData.email = email
  }

  const phone = student.phone ?? profile?.phone
  if (phone) {
    customerData.phone = phone
  }

  const asaasCustomer = await asaasRequest<AsaasCustomer>('/customers', customerData)

  const { error: insertError } = await supabase.from('asaas_customers').insert({
    academy_id: student.academy_id,
    asaas_customer_id: asaasCustomer.id,
    student_id: student.id
  })

  if (insertError) {
    throw insertError
  }

  return asaasCustomer.id
}

async function findOpenPayment(
  supabase: ReturnType<typeof createServiceClient>,
  studentId: string,
  academyId: string
): Promise<OpenPaymentRow | null> {
  const { data } = await supabase
    .from('payments')
    .select('id, academy_id, student_id, amount, status, due_date, pix_copy_paste, pix_qr_code_payload, asaas_payment_id')
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .in('status', ['pending', 'overdue'])
    .not('pix_qr_code_payload', 'is', null)
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data as OpenPaymentRow | null
}

async function createAsaasPixCharge(
  asaasCustomerId: string,
  value: number,
  dueDate: string
): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>('/payments', {
    customer: asaasCustomerId,
    billingType: 'PIX',
    value,
    dueDate,
    description: 'Mensalidade Academia de Jiu-Jitsu'
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    assertPost(request)

    const supabase = createServiceClient()
    const user = await getAuthUser(request, supabase)

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, academy_id, profile_id, full_name, email, phone, next_due_date, status')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      throw new ApiError(404, 'not_found', 'Aluno ativo nao encontrado.')
    }

    if (!student.next_due_date) {
      throw new ApiError(400, 'bad_request', 'Mensalidade nao configurada. Contate a academia.')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle()

    const asaasCustomerId = await findOrCreateAsaasCustomer(supabase, student, profile)

    const existingPayment = await findOpenPayment(supabase, student.id, student.academy_id)

    if (existingPayment) {
      return jsonResponse({
        amount: Number(existingPayment.amount),
        dueDate: existingPayment.due_date,
        paymentId: existingPayment.asaas_payment_id ?? existingPayment.id,
        pixCopyPaste: existingPayment.pix_copy_paste,
        pixQrCodePayload: existingPayment.pix_qr_code_payload,
        status: existingPayment.status
      })
    }

    const { data: latestPayment } = await supabase
      .from('payments')
      .select('amount')
      .eq('student_id', student.id)
      .eq('academy_id', student.academy_id)
      .order('due_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const amount = latestPayment?.amount

    if (!amount || Number(amount) <= 0) {
      throw new ApiError(400, 'bad_request', 'Mensalidade nao configurada. Contate a academia.')
    }

    const asaasPayment = await createAsaasPixCharge(asaasCustomerId, Number(amount), student.next_due_date)

    if (!asaasPayment.pixTransaction?.payload || !asaasPayment.pixTransaction?.payloadRaw) {
      throw new ApiError(502, 'server_error', 'Resposta invalida do Asaas. Payload Pix nao gerado.')
    }

    const competenceMonth = new Date(student.next_due_date)
    competenceMonth.setDate(1)

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        academy_id: student.academy_id,
        amount: Number(amount),
        asaas_payment_id: asaasPayment.id,
        competence_month: competenceMonth.toISOString().slice(0, 10),
        due_date: student.next_due_date,
        pix_copy_paste: asaasPayment.pixTransaction.payload,
        pix_qr_code_payload: asaasPayment.pixTransaction.payloadRaw,
        status: 'pending',
        student_id: student.id
      })
      .select('id')
      .single()

    if (paymentError) {
      if (paymentError.code === '23505') {
        const { data: duplicatePayment } = await supabase
          .from('payments')
          .select('id, amount, status, due_date, pix_copy_paste, pix_qr_code_payload, asaas_payment_id')
          .eq('student_id', student.id)
          .eq('academy_id', student.academy_id)
          .in('status', ['pending', 'overdue'])
          .not('pix_qr_code_payload', 'is', null)
          .order('due_date', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (duplicatePayment) {
          return jsonResponse({
            amount: Number(duplicatePayment.amount),
            dueDate: duplicatePayment.due_date,
            paymentId: duplicatePayment.asaas_payment_id ?? duplicatePayment.id,
            pixCopyPaste: duplicatePayment.pix_copy_paste,
            pixQrCodePayload: duplicatePayment.pix_qr_code_payload,
            status: duplicatePayment.status
          })
        }
      }

      throw paymentError
    }

    await supabase.from('audit_logs').insert({
      academy_id: student.academy_id,
      actor_user_id: user.id,
      action: 'pix_payment_created',
      entity_table: 'payments',
      entity_id: paymentRecord.id,
      metadata: {
        asaas_payment_id: asaasPayment.id,
        student_id: student.id
      }
    })

    return jsonResponse({
      amount: Number(amount),
      dueDate: student.next_due_date,
      paymentId: asaasPayment.id,
      pixCopyPaste: asaasPayment.pixTransaction.payload,
      pixQrCodePayload: asaasPayment.pixTransaction.payloadRaw,
      status: 'pending'
    })
  } catch (error) {
    return errorResponse(error)
  }
})

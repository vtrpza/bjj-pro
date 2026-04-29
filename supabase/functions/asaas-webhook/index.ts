import { createServiceClient } from '../_shared/supabase.ts'
import { ApiError, assertPost, errorResponse, jsonResponse, optionsResponse, readJsonObject } from '../_shared/http.ts'
import { requireEnv } from '../_shared/env.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    assertPost(request)

    const supabase = createServiceClient()
    const webhookToken = requireEnv('ASAAS_WEBHOOK_TOKEN')
    const body = await readJsonObject(request)

    const receivedToken = request.headers.get('asaas-access-token') ?? ''
    if (receivedToken !== webhookToken) {
      throw new ApiError(401, 'unauthorized', 'Token de webhook invalido.')
    }

    const eventType = body['event']
    const payment = body['payment']

    if (!eventType || typeof eventType !== 'string') {
      throw new ApiError(400, 'bad_request', 'Campo event obrigatorio.')
    }

    if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
      throw new ApiError(400, 'bad_request', 'Campo payment obrigatorio.')
    }

    const paymentData = payment as Record<string, unknown>
    const asaasPaymentId = paymentData['id']

    if (!asaasPaymentId || typeof asaasPaymentId !== 'string') {
      throw new ApiError(400, 'bad_request', 'Campo payment.id obrigatorio.')
    }

    const asaasEventId = `${asaasPaymentId}_${eventType}`

    const { data: existingEvent, error: lookupError } = await supabase
      .from('asaas_payment_events')
      .select('id, processed_at')
      .eq('asaas_event_id', asaasEventId)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (existingEvent && existingEvent.processed_at) {
      return jsonResponse({ received: true, alreadyProcessed: true, eventId: asaasEventId })
    }

    let eventId: string

    if (existingEvent) {
      eventId = existingEvent.id
    } else {
      const { data: insertedEvent, error: insertError } = await supabase
        .from('asaas_payment_events')
        .insert({
          asaas_event_id: asaasEventId,
          asaas_payment_id: asaasPaymentId,
          event_type: eventType,
          payload: body
        })
        .select('id')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          return jsonResponse({ received: true, alreadyProcessed: true, eventId: asaasEventId })
        }

        throw insertError
      }

      eventId = insertedEvent.id
    }

    await processWebhookEvent(supabase, eventType, paymentData, asaasPaymentId, asaasEventId)

    const { error: markError } = await supabase
      .from('asaas_payment_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventId)

    if (markError) {
      throw markError
    }

    return jsonResponse({ received: true, processed: true, eventId: asaasEventId })
  } catch (error) {
    return errorResponse(error)
  }
})

async function processWebhookEvent(
  supabase: ReturnType<typeof createServiceClient>,
  eventType: string,
  paymentData: Record<string, unknown>,
  asaasPaymentId: string,
  asaasEventId: string
) {
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, academy_id, student_id, status, due_date, competence_month')
    .eq('asaas_payment_id', asaasPaymentId)
    .maybeSingle()

  if (paymentError) {
    throw paymentError
  }

  if (!payment) {
    return
  }

  switch (eventType) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      await handlePaymentConfirmed(supabase, payment, paymentData, asaasEventId)
      break

    case 'PAYMENT_OVERDUE':
      await handlePaymentOverdue(supabase, payment, asaasEventId)
      break

    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      await handlePaymentCancelled(supabase, payment, asaasEventId)
      break

    default:
      break
  }
}

async function handlePaymentConfirmed(
  supabase: ReturnType<typeof createServiceClient>,
  payment: { id: string; academy_id: string; student_id: string; status: string; due_date: string },
  paymentData: Record<string, unknown>,
  asaasEventId: string
) {
  if (payment.status === 'paid') {
    return
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('payments')
    .update({ paid_at: now, status: 'paid' })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .or('status.eq.overdue')

  if (updateError) {
    throw updateError
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, academy_id, next_due_date')
    .eq('id', payment.student_id)
    .eq('academy_id', payment.academy_id)
    .maybeSingle()

  if (studentError) {
    throw studentError
  }

  if (student) {
    const currentDueDate = student.next_due_date ? new Date(student.next_due_date) : new Date()
    const newDueDate = new Date(currentDueDate)
    newDueDate.setMonth(newDueDate.getMonth() + 1)

    const { error: renewError } = await supabase
      .from('students')
      .update({ next_due_date: newDueDate.toISOString().slice(0, 10) })
      .eq('id', student.id)
      .eq('academy_id', student.academy_id)

    if (renewError) {
      throw renewError
    }
  }

  await supabase.from('audit_logs').insert({
    academy_id: payment.academy_id,
    action: 'payment_confirmed',
    entity_table: 'payments',
    entity_id: payment.id,
    metadata: { asaas_event_id: asaasEventId, asaas_payment_id: paymentData['id'], status: paymentData['status'] }
  })
}

async function handlePaymentOverdue(
  supabase: ReturnType<typeof createServiceClient>,
  payment: { id: string; academy_id: string; student_id: string; status: string },
  asaasEventId: string
) {
  if (payment.status === 'overdue' || payment.status === 'paid') {
    return
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({ status: 'overdue' })
    .eq('id', payment.id)
    .in('status', ['pending'])

  if (updateError) {
    throw updateError
  }

  await supabase.from('audit_logs').insert({
    academy_id: payment.academy_id,
    action: 'payment_overdue',
    entity_table: 'payments',
    entity_id: payment.id,
    metadata: { asaas_event_id: asaasEventId }
  })
}

async function handlePaymentCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  payment: { id: string; academy_id: string; student_id: string; status: string },
  asaasEventId: string
) {
  if (payment.status === 'cancelled') {
    return
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('id', payment.id)

  if (updateError) {
    throw updateError
  }

  await supabase.from('audit_logs').insert({
    academy_id: payment.academy_id,
    action: 'payment_cancelled',
    entity_table: 'payments',
    entity_id: payment.id,
    metadata: { asaas_event_id: asaasEventId }
  })
}

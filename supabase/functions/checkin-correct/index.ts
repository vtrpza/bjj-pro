import { createServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { ApiError, assertPost, errorResponse, jsonResponse, optionsResponse, readJsonObject } from '../_shared/http.ts'
import { optionalString } from '../_shared/validation.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    assertPost(request)

    const supabase = createServiceClient()
    const user = await getAuthUser(request, supabase)
    const body = await readJsonObject(request)
    const checkinId = optionalString(body, 'checkinId')
    const reason = optionalString(body, 'reason')

    if (!checkinId) {
      throw new ApiError(400, 'bad_request', 'Informe o ID do check-in.', 'INVALID_CHECKIN')
    }

    if (!reason || reason.length < 5) {
      throw new ApiError(400, 'bad_request', 'Informe o motivo da correcao (minimo 5 caracteres).', 'INVALID_REASON')
    }

    const { data: member, error: memberError } = await supabase
      .from('academy_members')
      .select('academy_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (memberError) {
      throw memberError
    }

    if (!member) {
      throw new ApiError(403, 'forbidden', 'Apenas dono ou admin pode corrigir presencas.', 'NOT_ADMIN')
    }

    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .select('id, academy_id, student_id, training_session_id, status')
      .eq('id', checkinId)
      .eq('academy_id', member.academy_id)
      .maybeSingle()

    if (checkinError) {
      throw checkinError
    }

    if (!checkin) {
      throw new ApiError(404, 'not_found', 'Check-in nao encontrado.', 'CHECKIN_NOT_FOUND')
    }

    if (checkin.status === 'cancelled') {
      throw new ApiError(409, 'conflict', 'Check-in ja foi cancelado.', 'ALREADY_CANCELLED')
    }

    const { error: updateError } = await supabase
      .from('checkins')
      .update({
        corrected_by: user.id,
        corrected_at: new Date().toISOString(),
        notes: reason,
        status: 'cancelled'
      })
      .eq('id', checkinId)
      .eq('academy_id', member.academy_id)

    if (updateError) {
      throw updateError
    }

    await supabase.from('audit_logs').insert({
      academy_id: member.academy_id,
      actor_user_id: user.id,
      action: 'checkin_corrected',
      entity_table: 'checkins',
      entity_id: checkinId,
      metadata: {
        checkin_id: checkinId,
        corrected_by: user.id,
        previous_status: checkin.status,
        reason,
        student_id: checkin.student_id,
        training_session_id: checkin.training_session_id
      }
    })

    return jsonResponse({
      checkinId,
      reason,
      success: true
    })
  } catch (error) {
    return errorResponse(error)
  }
})

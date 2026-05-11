import { createServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { ApiError, assertPost, errorResponse, jsonResponse, optionsResponse, readJsonObject } from '../_shared/http.ts'
import { requireEnv } from '../_shared/env.ts'
import { optionalString } from '../_shared/validation.ts'
import { sha256Hex, verifyQrToken } from '../_shared/qr.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    assertPost(request)

    const supabase = createServiceClient()
    const user = await getAuthUser(request, supabase)
    const body = await readJsonObject(request)
    const token = optionalString(body, 'token')
    const manualCode = optionalString(body, 'manualCode')

    if (!token && !manualCode) {
      throw new ApiError(400, 'bad_request', 'Informe o QR ou codigo manual.', 'INVALID_CODE')
    }

    if (manualCode && !manualCode.trim()) {
      throw new ApiError(400, 'bad_request', 'Codigo de check-in invalido.', 'INVALID_CODE')
    }

    const secret = requireEnv('QR_TOKEN_SECRET')
    const tokenPayload = token ? await verifyQrToken(token, secret) : null
    const nonce = tokenPayload?.nonce ?? manualCode?.toUpperCase()

    if (!nonce) {
      throw new ApiError(400, 'bad_request', 'Codigo de check-in invalido.', 'INVALID_CODE')
    }

    if (tokenPayload && new Date(tokenPayload.expiresAt).getTime() <= Date.now()) {
      throw new ApiError(403, 'forbidden', 'QR expirado. Solicite um novo codigo na academia.', 'TOKEN_EXPIRED')
    }

    const tokenHash = await sha256Hex(nonce)
    let sessionQuery = supabase
      .from('training_sessions')
      .select('id, academy_id, title, status, qr_expires_at')
      .eq('qr_token_hash', tokenHash)
      .gt('qr_expires_at', new Date().toISOString())
      .limit(1)

    if (tokenPayload) {
      sessionQuery = sessionQuery.eq('id', tokenPayload.sessionId).eq('academy_id', tokenPayload.academyId)
    }

    const { data: session, error: sessionError } = await sessionQuery.maybeSingle()

    if (sessionError) {
      throw sessionError
    }

    if (!session) {
      throw new ApiError(403, 'forbidden', 'QR expirado ou treino indisponivel.', 'SESSION_NOT_FOUND')
    }

    if (session.status !== 'open') {
      throw new ApiError(403, 'forbidden', 'Treino fechado.', 'SESSION_CLOSED')
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, academy_id')
      .eq('profile_id', user.id)
      .eq('academy_id', session.academy_id)
      .eq('status', 'active')
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      throw new ApiError(403, 'forbidden', 'Aluno ativo nao encontrado para esta academia.', 'NOT_MEMBER')
    }

    const { data: checkin, error: insertError } = await supabase
      .from('checkins')
      .insert({
        academy_id: session.academy_id,
        created_by: user.id,
        source: token ? 'qr' : 'manual',
        student_id: student.id,
        training_session_id: session.id
      })
      .select('id, checked_in_at')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        throw new ApiError(409, 'conflict', 'Check-in ja realizado neste treino.', 'DUPLICATE_CHECKIN')
      }

      throw insertError
    }

    await supabase.from('audit_logs').insert({
      academy_id: session.academy_id,
      actor_user_id: user.id,
      action: 'checkin_created',
      entity_table: 'checkins',
      entity_id: checkin.id,
      metadata: { student_id: student.id, training_session_id: session.id, source: token ? 'qr' : 'manual' }
    })

    return jsonResponse({
      checkedInAt: checkin.checked_in_at,
      checkinId: checkin.id,
      sessionTitle: session.title,
      studentName: student.full_name
    })
  } catch (error) {
    return errorResponse(error)
  }
})

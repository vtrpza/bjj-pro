import { createServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { ApiError, assertPost, errorResponse, jsonResponse, optionsResponse, readJsonObject } from '../_shared/http.ts'
import { requireEnv } from '../_shared/env.ts'
import { optionalPositiveInteger, optionalString } from '../_shared/validation.ts'
import { createManualCode, sha256Hex, signQrPayload } from '../_shared/qr.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    assertPost(request)

    const supabase = createServiceClient()
    const user = await getAuthUser(request, supabase)
    const secret = requireEnv('QR_TOKEN_SECRET')
    const body = await readJsonObject(request)
    const academyId = optionalString(body, 'academyId')
    const title = optionalString(body, 'title') ?? 'Treino de Jiu-Jitsu'
    const ttlMinutes = Math.min(optionalPositiveInteger(body, 'ttlMinutes') ?? 10, 30)

    let memberQuery = supabase
      .from('academy_members')
      .select('academy_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .order('created_at', { ascending: true })
      .limit(1)

    if (academyId) {
      memberQuery = memberQuery.eq('academy_id', academyId)
    }

    const { data: member, error: memberError } = await memberQuery.maybeSingle()

    if (memberError) {
      throw memberError
    }

    if (!member) {
      throw new ApiError(403, 'forbidden', 'Apenas dono ou admin pode gerar QR do treino.')
    }

    const trainingDate = new Date().toISOString().slice(0, 10)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString()

    const { data: existingSession, error: sessionLookupError } = await supabase
      .from('training_sessions')
      .select('id, academy_id, title, training_date, status')
      .eq('academy_id', member.academy_id)
      .eq('training_date', trainingDate)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionLookupError) {
      throw sessionLookupError
    }

    const session = existingSession ?? (await createTrainingSession(supabase, {
      academyId: member.academy_id,
      createdBy: user.id,
      title,
      trainingDate
    }))

    const manualCode = createManualCode()
    const token = await signQrPayload(
      {
        academyId: member.academy_id,
        expiresAt,
        nonce: manualCode,
        sessionId: session.id
      },
      secret
    )
    const tokenHash = await sha256Hex(manualCode)

    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({ qr_expires_at: expiresAt, qr_token_hash: tokenHash, status: 'open' })
      .eq('id', session.id)
      .eq('academy_id', member.academy_id)

    if (updateError) {
      throw updateError
    }

    return jsonResponse({
      academyId: member.academy_id,
      expiresAt,
      manualCode,
      sessionId: session.id,
      title: session.title,
      token,
      trainingDate
    })
  } catch (error) {
    return errorResponse(error)
  }
})

async function createTrainingSession(
  supabase: ReturnType<typeof createServiceClient>,
  values: { academyId: string; createdBy: string; title: string; trainingDate: string }
) {
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      academy_id: values.academyId,
      created_by: values.createdBy,
      status: 'open',
      title: values.title,
      training_date: values.trainingDate
    })
    .select('id, academy_id, title, training_date, status')
    .single()

  if (error) {
    throw error
  }

  return data
}

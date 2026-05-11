import { createServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { ApiError, assertPost, errorResponse, jsonResponse, optionsResponse, readJsonObject } from '../_shared/http.ts'

type PromotionBody = {
  academyId: string
  newBeltId: string | null
  newGrau: number
  reason: string
  studentId: string
}

function parseBody(raw: Record<string, unknown>): PromotionBody {
  const studentId = typeof raw.studentId === 'string' ? raw.studentId.trim() : ''
  const academyId = typeof raw.academyId === 'string' ? raw.academyId.trim() : ''
  const rawBeltId = typeof raw.newBeltId === 'string' ? raw.newBeltId.trim() : null
  const newBeltId = rawBeltId && rawBeltId.length > 0 ? rawBeltId : null
  const newGrau = typeof raw.newGrau === 'number' ? raw.newGrau : 0
  const reason = typeof raw.reason === 'string' ? raw.reason : ''

  if (!studentId) {
    throw new ApiError(400, 'bad_request', 'ID do aluno e obrigatorio.')
  }

  if (!academyId) {
    throw new ApiError(400, 'bad_request', 'ID da academia e obrigatorio.')
  }

  if (!reason || reason.trim().length < 3) {
    throw new ApiError(400, 'bad_request', 'Motivo deve ter pelo menos 3 caracteres.')
  }

  if (newGrau < 0 || newGrau > 4) {
    throw new ApiError(400, 'bad_request', 'Grau deve estar entre 0 e 4.')
  }

  return { academyId, newBeltId, newGrau, reason: reason.trim(), studentId }
}

async function verifyAdminMembership(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  academyId: string
) {
  const { data: membership, error } = await supabase
    .from('academy_members')
    .select('id, role')
    .eq('user_id', userId)
    .eq('academy_id', academyId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!membership) {
    throw new ApiError(403, 'forbidden', 'Voce nao e membro desta academia.')
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ApiError(403, 'forbidden', 'Apenas administradores podem promover alunos.')
  }
}

async function validatePromotionPath(
  supabase: ReturnType<typeof createServiceClient>,
  studentId: string,
  academyId: string,
  newBeltId: string | null,
  newGrau: number
) {
  console.log('[graduation-promote] querying student:', { studentId, academyId })

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, academy_id, belt_id, grau, full_name, bjj_belts(id, audience, name, rank, max_grau)')
    .eq('id', studentId)
    .eq('academy_id', academyId)
    .single()

  console.log('[graduation-promote] student query result:', { found: !!student, errorCode: studentError?.code, errorMessage: studentError?.message })

  if (studentError) {
    if (studentError.code === 'PGRST116') {
      // Verificar se o aluno existe sem filtro de academy_id para debug
      const { data: anyStudent, error: anyError } = await supabase
        .from('students')
        .select('id, academy_id, full_name')
        .eq('id', studentId)
        .maybeSingle()
      console.log('[graduation-promote] student without academy filter:', { found: !!anyStudent, academyId: anyStudent?.academy_id, error: anyError?.message })
      throw new ApiError(404, 'not_found', `Aluno ${studentId} nao encontrado na academia ${academyId}.`)
    }
    throw studentError
  }

  const currentBelt = student.bjj_belts as { id: string; audience: string; name: string; rank: number; max_grau: number } | null
  if (!currentBelt) {
    throw new ApiError(500, 'server_error', 'Faixa do aluno nao encontrada.')
  }

  const currentGrau = student.grau
  const studentBeltId = (student.belt_id ?? '').toString().toLowerCase()
  const requestedBeltId = (newBeltId ?? '').toString().toLowerCase()
  const isBeltChange = requestedBeltId.length > 0 && requestedBeltId !== studentBeltId

  console.log('[graduation-promote] studentId:', studentId, 'currentBeltId:', studentBeltId, 'requestedBeltId:', requestedBeltId, 'isBeltChange:', isBeltChange, 'currentGrau:', currentGrau, 'newGrau:', newGrau)

  if (isBeltChange) {
    const { data: newBelt, error: beltError } = await supabase
      .from('bjj_belts')
      .select('id, audience, name, rank, max_grau')
      .eq('id', newBeltId)
      .single()

    if (beltError) {
      throw new ApiError(400, 'bad_request', 'Nova faixa invalida.')
    }

    if (newBelt.audience !== currentBelt.audience) {
      throw new ApiError(400, 'bad_request', 'Nova faixa nao pertence ao mesmo caminho (adulto/infantil).')
    }

    if (newBelt.rank !== currentBelt.rank + 1) {
      throw new ApiError(400, 'bad_request', 'So e possivel promover para a proxima faixa.')
    }

    if (newGrau !== 0 && newGrau !== 1) {
      throw new ApiError(400, 'bad_request', 'Ao trocar de faixa, o grau deve ser 0 ou 1.')
    }
  } else {
    if (newGrau <= currentGrau) {
      throw new ApiError(400, 'bad_request', `Novo grau (${newGrau}) deve ser maior que o atual (${currentGrau}).`)
    }

    if (newGrau > currentBelt.max_grau) {
      throw new ApiError(400, 'bad_request', `Grau maximo para esta faixa e ${currentBelt.max_grau}.`)
    }
  }

  return {
    currentBeltName: currentBelt.name,
    currentGrau,
    studentName: student.full_name
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    assertPost(request)

    const supabase = createServiceClient()
    const user = await getAuthUser(request, supabase)
    const rawBody = await readJsonObject(request)
    console.log('[graduation-promote] raw body keys:', Object.keys(rawBody))
    console.log('[graduation-promote] raw body:', JSON.stringify(rawBody))
    const body = parseBody(rawBody)

    await verifyAdminMembership(supabase, user.id, body.academyId)

    const { currentBeltName, currentGrau, studentName } = await validatePromotionPath(
      supabase,
      body.studentId,
      body.academyId,
      body.newBeltId,
      body.newGrau
    )

    const updatePayload: Record<string, unknown> = {}
    if (body.newBeltId) {
      updatePayload.belt_id = body.newBeltId
    }
    updatePayload.grau = body.newGrau

    const { error: updateError, data: updatedStudents } = await supabase
      .from('students')
      .update(updatePayload)
      .eq('id', body.studentId)
      .eq('academy_id', body.academyId)
      .select()

    if (updateError) {
      throw updateError
    }

    if (!updatedStudents || updatedStudents.length === 0) {
      throw new ApiError(404, 'not_found', 'Aluno nao encontrado nesta academia.')
    }

    const { data: newBeltData } = body.newBeltId
      ? await supabase.from('bjj_belts').select('name').eq('id', body.newBeltId).single()
      : { data: null }

    const newBeltName = (newBeltData as { name: string } | null)?.name ?? currentBeltName

    await supabase.from('audit_logs').insert({
      academy_id: body.academyId,
      actor_user_id: user.id,
      action: 'graduation_promoted',
      entity_table: 'students',
      entity_id: body.studentId,
      metadata: {
        from_belt: currentBeltName,
        from_grau: currentGrau,
        reason: body.reason,
        student_name: studentName,
        to_belt: newBeltName,
        to_grau: body.newGrau
      }
    })

    return jsonResponse({
      newBeltId: body.newBeltId,
      newGrau: body.newGrau,
      studentId: body.studentId,
      success: true
    })
  } catch (error) {
    return errorResponse(error)
  }
})

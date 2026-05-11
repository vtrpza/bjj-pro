export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*'
}

export type ApiErrorCode =
  | 'bad_request'
  | 'conflict'
  | 'forbidden'
  | 'method_not_allowed'
  | 'not_found'
  | 'server_error'
  | 'unauthorized'

export type ApiErrorDetailCode =
  | 'ALREADY_CANCELLED'
  | 'CHECKIN_NOT_FOUND'
  | 'DUPLICATE_CHECKIN'
  | 'INVALID_CHECKIN'
  | 'INVALID_CODE'
  | 'INVALID_REASON'
  | 'INVALID_TOKEN'
  | 'NOT_ADMIN'
  | 'NOT_MEMBER'
  | 'SESSION_CLOSED'
  | 'SESSION_NOT_FOUND'
  | 'TOKEN_EXPIRED'

export class ApiError extends Error {
  code: ApiErrorCode
  errorCode?: ApiErrorDetailCode
  status: number

  constructor(status: number, code: ApiErrorCode, message: string, errorCode?: ApiErrorDetailCode) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errorCode = errorCode
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status
  })
}

export function optionsResponse() {
  return new Response('ok', { headers: corsHeaders })
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const body: { error: { code: ApiErrorCode; errorCode?: ApiErrorDetailCode; message: string } } = {
      error: { code: error.code, message: error.message }
    }
    if (error.errorCode) {
      body.error.errorCode = error.errorCode
    }
    return jsonResponse(body, error.status)
  }

  return jsonResponse({ error: { code: 'server_error', message: 'Erro interno.' } }, 500)
}

export function assertPost(request: Request) {
  if (request.method !== 'POST') {
    throw new ApiError(405, 'method_not_allowed', 'Metodo nao permitido.')
  }
}

export async function readJsonObject(request: Request) {
  try {
    const value = await request.json()

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ApiError(400, 'bad_request', 'Corpo JSON invalido.')
    }

    return value as Record<string, unknown>
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(400, 'bad_request', 'Corpo JSON invalido.')
  }
}

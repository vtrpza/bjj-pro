import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { requireEnv } from './env.ts'
import { ApiError } from './http.ts'

export function createServiceClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false
    }
  })
}

export async function getAuthUser(request: Request, supabase: ReturnType<typeof createServiceClient>) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'unauthorized', 'Sessao obrigatoria.')
  }

  const token = authorization.slice('Bearer '.length).trim()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new ApiError(401, 'unauthorized', 'Sessao invalida.')
  }

  return data.user
}

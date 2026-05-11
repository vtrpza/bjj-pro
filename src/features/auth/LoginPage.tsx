import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/StateViews'
import { hasSupabaseConfig, supabase } from '../../shared/lib/supabase'

function getHomePath(role: string | undefined) {
  return role === 'student' ? '/aluno' : '/admin'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, session, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'ready' && session && profile) {
      navigate(getHomePath(profile.role), { replace: true })
    }
  }, [navigate, profile, session, status])

  const isAuthenticatedButNoMembership = status === 'ready' && session && !profile

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      return
    }

    setError(null)
    setIsSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)

    if (signInError) {
      setError('Nao foi possivel entrar. Confira e-mail, senha e cadastro na academia.')
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card card">
        <div className="brand-mark" aria-hidden="true">JJ</div>
        <span className="eyebrow">BJJ App MVP</span>
        <h1>Entrar na Academia de Jiu-Jitsu</h1>
        <p>Use a conta vinculada ao seu perfil de aluno, professor ou administracao da academia.</p>

        {!hasSupabaseConfig ? (
          <EmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar login real. Sem essas variaveis, o app abre em modo local de demonstracao."
            action={<Link className="btn" to="/admin">Abrir demo local</Link>}
          />
        ) : isAuthenticatedButNoMembership ? (
          <EmptyState
            title="Conta sem vinculo de academia"
            description="Seu login foi autenticado, mas voce ainda nao esta vinculado a uma academia como aluno, professor ou administrador. Entre em contato com o administrador da academia para concluir o cadastro."
            action={
              <Button onClick={() => { void supabase?.auth.signOut() }} variant="secondary">
                Sair da conta
              </Button>
            }
          />
        ) : (
          <form className="form-card" onSubmit={handleSubmit}>
            <label className="field">
              <span>E-mail</span>
              <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label className="field">
              <span>Senha</span>
              <div className="password-input-wrapper">
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  {showPassword ? (
                    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" x2="23" y1="1" y2="23" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <Button disabled={isSubmitting} isBlock type="submit">
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
            <Link className="auth-link" to="/login/reset">Esqueci minha senha</Link>
          </form>
        )}
      </section>
    </main>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import { PageHeader } from '../../shared/components/PageHeader'
import { formatBeltAndGrau, studentProfileSchema } from '../../shared/domain/studentSummary'
import type { StudentProfileFormValues } from '../../shared/domain/studentSummary'
import { fetchLinkedStudentExperience, updateStudentProfile } from '../../shared/lib/studentQueries'
import { supabase } from '../../shared/lib/supabase'

const defaultValues: StudentProfileFormValues = {
  fullName: '',
  phone: ''
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function StudentProfilePage() {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const queryClient = useQueryClient()
  const canUseSupabase = Boolean(supabase && academyId && profile?.id && !isPlaceholderMode)
  const studentQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchLinkedStudentExperience({ academyId, client: supabase, profileId: profile?.id }),
    queryKey: ['student-experience', academyId, profile?.id]
  })
  const form = useForm<StudentProfileFormValues>({
    defaultValues,
    resolver: zodResolver(studentProfileSchema)
  })
  const mutation = useMutation({
    mutationFn: (values: StudentProfileFormValues) => updateStudentProfile({ client: supabase, profileId: profile?.id, values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-experience', academyId, profile?.id] })
    }
  })

  useEffect(() => {
    if (studentQuery.data?.profile) {
      form.reset({
        fullName: studentQuery.data.profile.full_name,
        phone: studentQuery.data.profile.phone ?? ''
      })
    }
  }, [form, studentQuery.data])

  const student = studentQuery.data?.student

  return (
    <section>
      <PageHeader
        eyebrow="Perfil do aluno"
        title="Seus dados"
        description="Atualize apenas dados seguros do perfil. Faixa, grau e dados de mensalidade sao controlados pela academia."
      />

      {!canUseSupabase ? (
        <EmptyState
          title="Perfil em modo local"
          description="Com Supabase configurado, esta tela atualiza profiles.full_name e profiles.phone sem alterar dados tecnicos do aluno."
        />
      ) : null}

      {studentQuery.isLoading ? <LoadingState title="Carregando perfil" description="Buscando dados do seu perfil e graduacao." /> : null}

      {studentQuery.error ? (
        <ErrorState title="Erro ao carregar perfil" description="Confira permissoes RLS para profiles e students vinculados ao aluno." />
      ) : null}

      {canUseSupabase && studentQuery.data ? (
        <div className="split-grid">
          <form className="card form-card" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <h2>Dados editaveis</h2>
            <label className="field">
              <span>Nome completo</span>
              <input {...form.register('fullName')} placeholder="Seu nome completo" />
              {form.formState.errors.fullName ? <small>{form.formState.errors.fullName.message}</small> : null}
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                {...form.register('phone')}
                inputMode="tel"
                placeholder="(11) 99999-9999"
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value)
                  form.setValue('phone', formatted, { shouldValidate: true, shouldDirty: true })
                }}
              />
              {form.formState.errors.phone ? <small>{form.formState.errors.phone.message}</small> : null}
            </label>
            {mutation.error ? <p className="form-error">Nao foi possivel salvar seu perfil.</p> : null}
            {mutation.isSuccess ? <p className="form-success">Perfil salvo.</p> : null}
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </form>

          <div className="card list-card">
            <h2>Dados do Jiu-Jitsu</h2>
            {student ? (
              <div className="readonly-list">
                <p><strong>Aluno:</strong> {student.full_name}</p>
                <p><strong>Graduacao:</strong> {formatBeltAndGrau(student.belt_name, student.grau)}</p>
                <p><strong>Mensalidade:</strong> {student.next_due_date ?? 'Sem vencimento cadastrado'}</p>
                <p><strong>Status:</strong> {student.status === 'active' ? 'Ativo' : 'Inativo'}</p>
              </div>
            ) : (
              <EmptyState title="Aluno nao vinculado" description="A academia ainda precisa vincular sua conta a um registro de aluno." />
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

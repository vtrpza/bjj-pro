import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateViews'
import { PageHeader } from '../../shared/components/PageHeader'
import { academySettingsSchema } from '../../shared/domain/academy'
import type { AcademySettings, AcademySettingsFormValues } from '../../shared/domain/academy'
import { fetchAcademySettings, updateAcademySettings } from '../../shared/lib/academyQueries'
import { supabase } from '../../shared/lib/supabase'

const defaultSettingsValues: AcademySettingsFormValues = {
  address: '',
  checkinsPerGrau: '8',
  contactEmail: '',
  contactPhone: '',
  logoUrl: '',
  name: '',
  primaryColor: '#000000'
}

function toSettingsFormValues(settings: AcademySettings | null): AcademySettingsFormValues {
  return {
    address: settings?.address ?? '',
    checkinsPerGrau: String(settings?.checkins_per_grau ?? 8),
    contactEmail: settings?.email ?? '',
    contactPhone: settings?.phone ?? '',
    logoUrl: settings?.logo_url ?? '',
    name: settings?.name ?? '',
    primaryColor: settings?.primary_color ?? '#000000'
  }
}

function applyAccentColor(color: string) {
  document.documentElement.style.setProperty('--c-accent', color)
}

export function SettingsPage() {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const queryClient = useQueryClient()
  const canUseSupabase = Boolean(supabase && academyId && !isPlaceholderMode)
  const settingsQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchAcademySettings(supabase, academyId),
    queryKey: ['academy-settings', academyId]
  })
  const form = useForm<AcademySettingsFormValues>({
    defaultValues: defaultSettingsValues,
    resolver: zodResolver(academySettingsSchema)
  })
  const mutation = useMutation({
    mutationFn: (values: AcademySettingsFormValues) => updateAcademySettings({ academyId, client: supabase, values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academy-settings', academyId] })
    }
  })

  useEffect(() => {
    if (settingsQuery.data !== undefined) {
      form.reset(toSettingsFormValues(settingsQuery.data))
    }
  }, [form, settingsQuery.data])

  useEffect(() => {
    const settings = settingsQuery.data
    if (settings?.primary_color) {
      applyAccentColor(settings.primary_color)
    }
  }, [settingsQuery.data])

  const watchedColor = form.watch('primaryColor')

  return (
    <section>
      <PageHeader
        eyebrow="Configuracoes"
        title="Academia de Jiu-Jitsu"
        description="Ajuste nome, marca visual e contatos basicos da academia piloto."
      />

      {!canUseSupabase ? (
        <EmptyState
          title="Configuracoes locais"
          description="Com Supabase configurado e contexto de academia, esta tela persiste os dados na tabela academies."
        />
      ) : null}

      {canUseSupabase && settingsQuery.isLoading ? (
        <LoadingState title="Carregando academia" description="Buscando configuracoes da academia." />
      ) : null}

      {canUseSupabase && settingsQuery.error ? (
        <ErrorState title="Erro ao buscar configuracoes" description="Confira RLS e as colunas da tabela academies." />
      ) : null}

      {canUseSupabase && !settingsQuery.isLoading && !settingsQuery.error && !settingsQuery.data ? (
        <EmptyState
          title="Academia nao encontrada"
          description="O perfil atual tem contexto de academia, mas nao existe registro correspondente em academies."
        />
      ) : null}

      {canUseSupabase && settingsQuery.data ? (
        <form className="card form-card settings-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <label className="field">
            <span>Nome da academia</span>
            <input {...form.register('name')} placeholder="Alpha Force Jiu-Jitsu" />
            {form.formState.errors.name ? <small>{form.formState.errors.name.message}</small> : null}
          </label>

          <div className="field-grid">
            <label className="field">
              <span>URL do logo</span>
              <input {...form.register('logoUrl')} inputMode="url" placeholder="https://..." />
              {form.formState.errors.logoUrl ? <small>{form.formState.errors.logoUrl.message}</small> : null}
            </label>

            <label className="field">
              <span>Cor principal</span>
              <input {...form.register('primaryColor')} type="color" />
              {form.formState.errors.primaryColor ? <small>{form.formState.errors.primaryColor.message}</small> : null}
            </label>
          </div>

          <div className="card brand-preview-card">
            <h2>Visual da marca</h2>
            <div className="brand-preview">
              <div className="color-swatch" style={{ background: watchedColor }} />
              <div>
                <p>Cor selecionada: <strong>{watchedColor}</strong></p>
                <Button variant="accent" style={{ background: watchedColor }} type="button">
                  Botao de exemplo
                </Button>
              </div>
            </div>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>E-mail de contato</span>
              <input {...form.register('contactEmail')} inputMode="email" placeholder="contato@academia.com" />
              {form.formState.errors.contactEmail ? <small>{form.formState.errors.contactEmail.message}</small> : null}
            </label>

            <label className="field">
              <span>Telefone/WhatsApp</span>
              <input {...form.register('contactPhone')} inputMode="tel" placeholder="(11) 99999-9999" />
              {form.formState.errors.contactPhone ? <small>{form.formState.errors.contactPhone.message}</small> : null}
            </label>
          </div>

          <label className="field">
            <span>Endereco</span>
            <input {...form.register('address')} placeholder="Rua, numero, bairro" />
            {form.formState.errors.address ? <small>{form.formState.errors.address.message}</small> : null}
          </label>

          <label className="field">
            <span>Check-ins por grau</span>
            <input {...form.register('checkinsPerGrau')} inputMode="numeric" type="number" min={1} max={30} placeholder="8" />
            {form.formState.errors.checkinsPerGrau ? <small>{form.formState.errors.checkinsPerGrau.message}</small> : null}
            <small className="field-hint">Numero de check-ins necessario para sugerir promocao de grau</small>
          </label>

          {mutation.error ? <p className="form-error">Nao foi possivel salvar as configuracoes da academia.</p> : null}
          {mutation.isSuccess ? <p className="form-success">Configuracoes salvas.</p> : null}

          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Salvando...' : 'Salvar configuracoes'}
          </Button>
        </form>
      ) : null}
    </section>
  )
}

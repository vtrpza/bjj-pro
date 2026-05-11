import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { applyAccentColor, loadCachedSettings, saveCachedSettings } from './academySettingsCache'
import { fetchAcademySettings } from '../../shared/lib/academyQueries'
import { supabase } from '../../shared/lib/supabase'
import type { AcademySettings } from '../../shared/domain/academy'

type AcademySettingsContextValue = {
  settings: AcademySettings | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const AcademySettingsContext = createContext<AcademySettingsContextValue | null>(null)

export function useAcademySettings(): AcademySettingsContextValue {
  const value = useContext(AcademySettingsContext)
  if (!value) {
    throw new Error('useAcademySettings must be used inside AcademySettingsProvider')
  }
  return value
}

type AcademySettingsProviderProps = {
  children: ReactNode
}

export function AcademySettingsProvider({ children }: AcademySettingsProviderProps) {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const queryClient = useQueryClient()

  const cached = useMemo(() => {
    if (academyId) return loadCachedSettings(academyId)
    return null
  }, [academyId])

  const canFetch = Boolean(supabase && academyId && !isPlaceholderMode)

  const query = useQuery({
    enabled: canFetch,
    initialData: cached,
    queryFn: () => fetchAcademySettings(supabase, academyId),
    queryKey: ['academy-settings', academyId],
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  useEffect(() => {
    if (query.data && academyId) {
      saveCachedSettings(academyId, query.data)
    }
  }, [query.data, academyId])

  useEffect(() => {
    if (query.data) {
      applyAccentColor(query.data.primary_color)
    } else if (cached) {
      applyAccentColor(cached.primary_color)
    }
  }, [query.data, cached])

  const value = useMemo<AcademySettingsContextValue>(
    () => ({
      error: query.error instanceof Error ? query.error : null,
      isLoading: query.isLoading,
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: ['academy-settings', academyId] })
      },
      settings: query.data ?? null
    }),
    [query.data, query.isLoading, query.error, queryClient, academyId]
  )

  return <AcademySettingsContext.Provider value={value}>{children}</AcademySettingsContext.Provider>
}

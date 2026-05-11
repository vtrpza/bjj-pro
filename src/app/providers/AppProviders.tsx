import type { ReactNode } from 'react'
import { AcademySettingsProvider } from './AcademySettingsContext'
import { AuthProvider } from './AuthProvider'
import { QueryProvider } from './QueryProvider'
import { InstallPrompt } from '../../shared/components/InstallPrompt'
import { UpdatePrompt } from '../../shared/components/UpdatePrompt'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AcademySettingsProvider>
          {children}
          <InstallPrompt />
          <UpdatePrompt />
        </AcademySettingsProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

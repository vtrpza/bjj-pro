import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LogoutButton } from '../../features/auth/LogoutButton'
import { MobileNavSheet } from '../../shared/components/MobileNavSheet'
import { NavFab } from '../../shared/components/NavFab'
import { useAuth } from '../providers/AuthContext'
import { useAcademySettings } from '../providers/AcademySettingsContext'
import { studentNavigation } from '../../shared/lib/navigation'

export function StudentLayout() {
  const { profile } = useAuth()
  const { settings } = useAcademySettings()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const firstName = profile?.fullName?.split(' ')[0] ?? 'Aluno'
  const title = settings?.name ?? 'Area do aluno'

  return (
    <div className="app-shell student-shell">
      <header className="topbar">
        {settings?.logo_url ? (
          <img alt="Logo" className="brand-mark-img" src={settings.logo_url} />
        ) : (
          <div className="brand-mark" aria-hidden="true">JJ</div>
        )}
        <div className="topbar-title">
          <strong>{title}</strong>
          <span>Ola, {firstName}</span>
        </div>
        <LogoutButton />
      </header>

      <main className="content content-narrow">
        <Outlet />
      </main>

      <NavFab isOpen={isNavOpen} onClick={() => setIsNavOpen((v) => !v)} />
      <MobileNavSheet
        items={studentNavigation}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        title="Menu do Aluno"
      />
    </div>
  )
}

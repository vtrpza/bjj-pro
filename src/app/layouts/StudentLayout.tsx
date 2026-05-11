import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LogoutButton } from '../../features/auth/LogoutButton'
import { MobileNavSheet } from '../../shared/components/MobileNavSheet'
import { NavFab } from '../../shared/components/NavFab'
import { useAuth } from '../providers/AuthContext'
import { studentNavigation } from '../../shared/lib/navigation'

export function StudentLayout() {
  const { profile } = useAuth()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const firstName = profile?.fullName?.split(' ')[0] ?? 'Aluno'

  return (
    <div className="app-shell student-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">JJ</div>
        <div className="topbar-title">
          <strong>Area do aluno</strong>
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

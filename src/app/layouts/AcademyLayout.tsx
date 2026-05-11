import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogoutButton } from '../../features/auth/LogoutButton'
import { MobileNavSheet } from '../../shared/components/MobileNavSheet'
import { NavFab } from '../../shared/components/NavFab'
import { useAuth } from '../providers/AuthContext'
import { adminNavigation } from '../../shared/lib/navigation'

export function AcademyLayout() {
  const { isPlaceholderMode, profile } = useAuth()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const title = isPlaceholderMode ? 'Sua Academia' : (profile?.fullName ?? 'Administração')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">JJ</div>
        <div className="topbar-title">
          <strong>{title}</strong>
          <span>Academia de Jiu-Jitsu</span>
        </div>
        <LogoutButton />
      </header>

      <div className="shell-body">
        <aside className="sidebar" aria-label="Navegacao da academia">
          {adminNavigation.map((item) => (
            <NavLink className="nav-item" key={item.href} to={item.href} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <NavFab isOpen={isNavOpen} onClick={() => setIsNavOpen((v) => !v)} />
      <MobileNavSheet
        items={adminNavigation}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        title="Menu da Academia"
      />
    </div>
  )
}

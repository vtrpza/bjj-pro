import { NavLink, Outlet } from 'react-router-dom'
import { LogoutButton } from '../../features/auth/LogoutButton'
import { adminNavigation } from '../../shared/lib/navigation'

export function AcademyLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">JJ</div>
        <div className="topbar-title">
          <strong>Alpha Force</strong>
          <span>Academia de Jiu-Jitsu</span>
        </div>
        <LogoutButton />
      </header>

      <div className="shell-body">
        <aside className="sidebar" aria-label="Navegacao da academia">
          {adminNavigation.map((item) => (
            <NavLink className="nav-item" key={item.href} to={item.href} end={item.end}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegacao principal da academia">
        {adminNavigation.map((item) => (
          <NavLink className="nav-item" key={item.href} to={item.href} end={item.end}>
            <span aria-hidden="true">{item.icon}</span>
            {item.shortLabel ?? item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

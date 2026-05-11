import type { NavIconKey } from '../components/NavIcon'

export type NavigationItem = {
  href: string
  label: string
  shortLabel?: string
  icon: NavIconKey
  end?: boolean
}

export const adminNavigation: NavigationItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { href: '/admin/alunos', label: 'Alunos', icon: 'students' },
  { href: '/admin/check-ins', label: 'Check-ins', shortLabel: 'Check-in', icon: 'checkin' },
  { href: '/admin/mensalidades', label: 'Mensalidades', shortLabel: 'Pix', icon: 'payments' },
  { href: '/admin/graduacao', label: 'Graduacao', shortLabel: 'Faixas', icon: 'graduation' },
  { href: '/admin/configuracoes', label: 'Configuracoes', icon: 'settings' }
]

export const studentNavigation: NavigationItem[] = [
  { href: '/aluno', label: 'Inicio', icon: 'home', end: true },
  { href: '/aluno/check-in', label: 'Check-in', icon: 'checkin' },
  { href: '/aluno/mensalidade', label: 'Mensalidade', shortLabel: 'Pix', icon: 'payments' },
  { href: '/aluno/graduacao', label: 'Graduacao', shortLabel: 'Faixa', icon: 'graduation' },
  { href: '/aluno/perfil', label: 'Perfil', icon: 'profile' }
]

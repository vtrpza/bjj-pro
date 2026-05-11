import { NavIcon } from './NavIcon'

type NavFabProps = {
  isOpen: boolean
  onClick: () => void
  label?: string
}

export function NavFab({ isOpen, onClick, label = 'Abrir menu' }: NavFabProps) {
  return (
    <button
      className={`nav-fab ${isOpen ? 'open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Fechar menu' : label}
      aria-expanded={isOpen}
      type="button"
    >
      <NavIcon icon={isOpen ? 'close' : 'menu'} />
    </button>
  )
}

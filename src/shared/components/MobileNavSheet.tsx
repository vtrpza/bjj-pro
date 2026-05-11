import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavigationItem } from '../lib/navigation'
import { NavIcon } from './NavIcon'

type MobileNavSheetProps = {
  items: NavigationItem[]
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function MobileNavSheet({ items, isOpen, onClose, title = 'Menu' }: MobileNavSheetProps) {
  const location = useLocation()
  const sheetRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => {
        firstLinkRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      document.body.style.overflow = ''
      const timer = setTimeout(() => {
        previouslyFocusedRef.current?.focus()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <div
      className={`nav-sheet-container ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
    >
      <div
        className="nav-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="nav-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="nav-sheet-header">
          <div className="nav-sheet-drag" aria-hidden="true" />
          <span className="nav-sheet-title">{title}</span>
          <button
            className="nav-sheet-close"
            onClick={onClose}
            aria-label="Fechar menu"
            type="button"
          >
            <NavIcon icon="close" />
          </button>
        </div>

        <nav className="nav-sheet-list" aria-label="Navegacao">
          {items.map((item, index) => {
            const isActive = item.end
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href)
            return (
              <NavLink
                key={item.href}
                ref={index === 0 ? firstLinkRef : undefined}
                className={`nav-sheet-item ${isActive ? 'active' : ''}`}
                to={item.href}
                end={item.end}
                onClick={onClose}
              >
                <NavIcon icon={item.icon as import('./NavIcon').NavIconKey} />
                <span>{item.label}</span>
                {isActive && <span className="nav-sheet-indicator" aria-hidden="true" />}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

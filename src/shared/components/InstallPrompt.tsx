import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'bjj-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getIsIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
}

function getIsStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function getIsDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  return Date.now() - Number(dismissedAt) < DISMISS_DURATION
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(getIsDismissed)

  useEffect(() => {
    if (getIsStandalone() || dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  const ios = getIsIOS()
  const showPrompt = !dismissed && !getIsStandalone() && (ios || deferredPrompt !== null)

  if (!showPrompt) return null

  if (ios) {
    return (
      <div className="install-prompt" role="banner">
        <div className="install-prompt-content">
          <p className="install-prompt-text">
            Instale o app na sua tela inicial: toque em <strong>Compartilhar</strong> → <strong>Adicionar a Tela de Início</strong>
          </p>
          <button className="install-prompt-dismiss" onClick={handleDismiss} type="button">
            Entendi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="install-prompt" role="banner">
      <div className="install-prompt-content">
        <p className="install-prompt-text">Instale o app na sua tela inicial</p>
        <div className="install-prompt-actions">
          <button className="install-prompt-install" onClick={handleInstall} type="button">
            Instalar
          </button>
          <button className="install-prompt-dismiss" onClick={handleDismiss} type="button">
            Depois
          </button>
        </div>
      </div>
    </div>
  )
}

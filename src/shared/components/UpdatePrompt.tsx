import { useCallback, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const DISMISS_KEY = 'bjj-update-dismissed'
const DISMISS_DURATION = 24 * 60 * 60 * 1000

function getIsDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  return Date.now() - Number(dismissedAt) < DISMISS_DURATION
}

export function UpdatePrompt() {
  const { needRefresh: needRefreshTuple, updateServiceWorker } = useRegisterSW()
  const [needRefresh] = needRefreshTuple
  const [dismissed, setDismissed] = useState(getIsDismissed)

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true)
  }, [updateServiceWorker])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  if (!needRefresh || dismissed) return null

  return (
    <div className="update-prompt" role="status">
      <div className="update-prompt-content">
        <p className="update-prompt-text">Nova versão disponível</p>
        <div className="update-prompt-actions">
          <button className="update-prompt-update" onClick={handleUpdate} type="button">
            Atualizar
          </button>
          <button className="update-prompt-dismiss" onClick={handleDismiss} type="button">
            Depois
          </button>
        </div>
      </div>
    </div>
  )
}

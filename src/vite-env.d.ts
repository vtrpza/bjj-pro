/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react'

  export function useRegisterSW(): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
  }
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
  }): (reloadPage?: boolean) => void
}

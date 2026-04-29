/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(): {
    needRefresh: boolean
    updateSW: (reloadPage?: boolean) => void
    offlineReady: boolean
    setOfflineReady: (value: boolean) => void
  }
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
  }): (reloadPage?: boolean) => void
}

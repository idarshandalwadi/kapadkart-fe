import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePWAUpdate() {
  const [offlineReady, setOfflineReady] = useState(false)
  const [needRefresh, setNeedRefresh] = useState(false)

  const {
    offlineReady: [swOfflineReady, setSWOfflineReady],
    needRefresh: [swNeedRefresh, setSWNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Periodically check for SW updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.warn('PWA registration failed:', error)
    },
  })

  useEffect(() => {
    setOfflineReady(swOfflineReady)
  }, [swOfflineReady])

  useEffect(() => {
    setNeedRefresh(swNeedRefresh)
  }, [swNeedRefresh])

  const dismissUpdate = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
    setSWOfflineReady(false)
    setSWNeedRefresh(false)
  }

  return {
    offlineReady,
    needRefresh,
    updateServiceWorker: () => updateServiceWorker(true),
    dismissUpdate,
  }
}

import { useCallback, useEffect, useState } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return Boolean(
        sessionStorage.getItem('kapadkart-pwa-install-dismissed') ||
        sessionStorage.getItem('kk-pwa-install-dismissed')
      )
    } catch {
      return false
    }
  })

  // Detect iOS Safari (no beforeinstallprompt event support)
  const isIOS =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream &&
    !isInstalled

  useEffect(() => {
    // Check if running in standalone display mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')

    setIsInstalled(isStandalone)

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e) => {
      setIsInstalled(e.matches)
      if (e.matches) setCanInstall(false)
    }
    mediaQuery.addEventListener('change', handleDisplayModeChange)
    return () => mediaQuery.removeEventListener('change', handleDisplayModeChange)
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    setIsInstalling(true)
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
        return true
      }
      return false
    } catch (err) {
      console.warn('Install prompt error:', err)
      return false
    } finally {
      setIsInstalling(false)
    }
  }, [deferredPrompt])

  const dismissPrompt = useCallback(() => {
    try {
      sessionStorage.setItem('kapadkart-pwa-install-dismissed', 'true')
    } catch {
      // ignore quota or security error
    }
    setIsDismissed(true)
  }, [])

  return {
    canInstall: canInstall && !isInstalled,
    isInstalled,
    isInstalling,
    isIOS,
    isDismissed,
    promptInstall,
    dismissPrompt,
  }
}

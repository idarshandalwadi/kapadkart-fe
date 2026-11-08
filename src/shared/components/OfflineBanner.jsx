import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        const timer = setTimeout(() => {
          setShowReconnected(false)
          setWasOffline(false)
        }, 3500)
        return () => clearTimeout(timer)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  const handleRetry = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      window.location.reload()
    } else {
      // Attempt a lightweight fetch test to check if connectivity resumed
      fetch(window.location.origin + window.location.pathname, { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          setIsOnline(true)
          setShowReconnected(true)
        })
        .catch(() => {
          setIsOnline(false)
        })
    }
  }

  // Back online toast
  if (showReconnected) {
    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex max-w-sm items-center gap-2.5 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md animate-[fade-down_250ms_ease_both]"
        role="status"
        aria-live="polite"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <i className="fa-solid fa-wifi text-xs" />
        </div>
        <p className="text-xs font-semibold text-emerald-200">
          Back online! Store connection restored.
        </p>
      </div>
    )
  }

  // Offline alert banner
  if (!isOnline) {
    return (
      <div
        className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] z-[1000] rounded-2xl bg-[#1a1c1e]/98 border border-amber-500/50 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-md animate-[fade-down_300ms_ease_both]"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <i className="fa-solid fa-cloud-arrow-down text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white tracking-tight">Offline Mode</p>
            <p className="mt-0.5 text-[0.72rem] text-[#9aa3ad] leading-relaxed">
              No internet connection. Cached views remain accessible; new sales/bookings will sync once reconnected.
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 text-[0.72rem] font-bold text-amber-300 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate text-[0.65rem]" />
            <span>Check Connection</span>
          </button>
        </div>
      </div>
    )
  }

  return null
}

import { usePWAUpdate } from '@/shared/hooks/usePWAUpdate'

export default function PWAReloadPrompt() {
  const { needRefresh, offlineReady, updateServiceWorker, dismissUpdate } = usePWAUpdate()

  if (!needRefresh && !offlineReady) return null

  if (needRefresh) {
    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex max-w-md items-center gap-3 rounded-2xl bg-[#1a1c1e]/98 border border-amber-500/40 p-3.5 shadow-2xl backdrop-blur-md animate-[fade-down_300ms_ease_both]"
        role="alert"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
          <i className="fa-solid fa-arrows-rotate text-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white">Update Available</p>
          <p className="text-[0.7rem] text-[#9aa3ad]">
            A new version of KapadKart is ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => updateServiceWorker()}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-all cursor-pointer"
        >
          Update Now
        </button>
        <button
          type="button"
          onClick={dismissUpdate}
          className="text-[#7a8290] hover:text-white p-1 text-xs cursor-pointer"
          aria-label="Dismiss update alert"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    )
  }

  // App is ready for offline browsing
  return (
    <div
      className="fixed bottom-4 right-4 z-[999] flex max-w-sm items-center gap-3 rounded-2xl bg-[#1a1c1e]/95 border border-emerald-500/40 p-3 shadow-xl backdrop-blur-md animate-[fade-up_300ms_ease_both]"
      role="status"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
        <i className="fa-solid fa-check text-xs" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white">Offline Ready</p>
        <p className="text-[0.68rem] text-[#9aa3ad]">
          App shell cached for fast offline access.
        </p>
      </div>
      <button
        type="button"
        onClick={dismissUpdate}
        className="text-[#7a8290] hover:text-white p-1 text-xs cursor-pointer"
        aria-label="Dismiss offline confirmation"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  )
}

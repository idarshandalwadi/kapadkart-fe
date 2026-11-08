import { usePWAInstall } from '@/shared/hooks/usePWAInstall'
import { useTenant } from '@/shared/tenant/TenantContext'
import { cn } from '@/shared/utils/cn'

export default function PWAInstallBanner() {
  const { canInstall, isInstalled, isInstalling, isIOS, isDismissed, promptInstall, dismissPrompt } =
    usePWAInstall()
  const { companyName } = useTenant()

  // Don't show if already installed or dismissed by user
  if (isInstalled || isDismissed) return null
  // Show only if native prompt is ready or user is on iOS Safari
  if (!canInstall && !isIOS) return null

  return (
    <div
      className={cn(
        'pwa-install-banner',
        'fixed left-0 right-0 z-[100]',
        // Above bottom nav on mobile
        'bottom-0 mb-[calc(4rem+env(safe-area-inset-bottom,0px))]',
        // Desktop floating card
        'min-[900px]:bottom-6 min-[900px]:left-auto min-[900px]:right-6 min-[900px]:mb-0 min-[900px]:w-[340px]',
        'mx-3 min-[900px]:mx-0',
        'rounded-2xl bg-[#1a1c1e]/98 border border-amber-500/30 shadow-[0_12px_36px_rgba(0,0,0,0.5)] p-4 backdrop-blur-md',
        'animate-[fade-up_300ms_ease_both]'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
          <i className="fa-solid fa-cloud-arrow-down text-lg" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white tracking-tight">
            Install {companyName || 'KapadKart'}
          </p>
          <p className="mt-0.5 text-xs text-[#9aa3ad] leading-relaxed">
            {isIOS
              ? "Tap Safari's Share button and select 'Add to Home Screen' for 1-tap store access."
              : 'Install on your device for fast 1-tap POS billing and offline access.'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          aria-label="Dismiss install prompt"
          className="text-[#7a8290] hover:text-white p-1 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {canInstall ? (
          <button
            type="button"
            id="pwa-install-btn"
            onClick={promptInstall}
            disabled={isInstalling}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-98 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isInstalling ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" />
                <span>Installing...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-download text-xs" />
                <span>Install App</span>
              </>
            )}
          </button>
        ) : isIOS ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-[0.75rem] font-semibold text-amber-300">
            <span>Tap</span>
            <i className="fa-solid fa-arrow-up-from-bracket text-xs" />
            <span>then &quot;Add to Home Screen&quot;</span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={dismissPrompt}
          className="rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-[#9aa3ad] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  )
}

import { cn } from '@/shared/utils/cn'

/**
 * Mobile and tablet sticky bottom action bar.
 * Ensures Save Settings and Discard actions are easily accessible without scrolling.
 */
function StickyActionBar({
  isDirty,
  saving,
  onSave,
  onDiscard,
  className = '',
}) {
  if (!isDirty) return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-6 transition-all duration-200 animate-soft-in lg:hidden',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className,
      )}
      role="region"
      aria-label="Unsaved changes bar"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-text truncate">
            Unsaved changes
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="btn-secondary h-9 px-3 text-xs sm:text-sm rounded-lg"
            onClick={onDiscard}
            disabled={saving}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn-primary h-9 px-4 text-xs sm:text-sm rounded-lg"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" aria-hidden="true" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk text-xs" aria-hidden="true" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StickyActionBar


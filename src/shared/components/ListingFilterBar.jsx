import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

/**
 * ListingFilterBar provides a mobile-first, data-visible filter toolbar.
 * On mobile (<768px), it collapses secondary filters (dates, page size, column picker, etc.)
 * behind an intuitive "Filters" toggle with an active-count badge, giving maximum
 * vertical space to actual business records. On desktop, controls can display expanded
 * or toggle on demand.
 */
export default function ListingFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  activeFilterCount = 0,
  activeChips = [],
  onClearAll,
  children,
  extraActions,
  className,
  ariaLabel = 'Listing search and filters',
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        'relative flex flex-col gap-2 rounded-xl sm:rounded-2xl border border-border bg-surface p-2.5 sm:p-3.5 shadow-xs transition-all',
        isOpen ? 'z-20' : 'z-10',
        className,
      )}
    >
      {/* Top Search & Filter Trigger Bar */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        {onSearchChange && (
          <div className="relative flex flex-1 items-center">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 text-xs text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="h-9 sm:h-10 w-full rounded-lg border border-border bg-white pl-8 pr-7 text-xs sm:text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            {Boolean(search) && (
              <button
                type="button"
                onClick={() => onSearchChange({ target: { value: '' } })}
                className="absolute right-2 flex size-5 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
                title="Clear search"
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Extra Actions (e.g. sort button or quick print) */}
        {extraActions && (
          <div className="flex items-center gap-1.5 shrink-0">
            {extraActions}
          </div>
        )}

        {/* Filter Toggle Button */}
        {children && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className={cn(
              'inline-flex h-9 sm:h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs sm:text-sm font-semibold transition-all',
              isOpen || activeFilterCount > 0
                ? 'border-accent bg-accent-soft text-accent-text shadow-2xs'
                : 'border-border bg-white text-text-secondary hover:border-border-strong hover:bg-surface-muted hover:text-text',
            )}
            title={isOpen ? 'Hide filters' : 'Show filters'}
          >
            <i className="fa-solid fa-sliders text-xs" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex size-4.5 sm:size-5 items-center justify-center rounded-full bg-accent text-[0.65rem] sm:text-[0.7rem] font-bold text-white leading-none">
                {activeFilterCount}
              </span>
            )}
            <i
              className={cn(
                'fa-solid fa-chevron-down text-[0.65rem] transition-transform duration-160',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Active Filter Chips Strip */}
      {activeChips && activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted mr-0.5">
            Active:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key || chip.label}
              className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft/70 px-2 py-0.5 text-[0.72rem] font-semibold text-accent-text"
            >
              <span>{chip.label}</span>
              {chip.onRemove && (
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="cursor-pointer text-accent-text/70 hover:text-accent-text"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <i className="fa-solid fa-xmark text-[0.65rem]" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="cursor-pointer text-[0.72rem] font-semibold text-accent hover:underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Collapsible Filter Panel (Children) */}
      {children && (
        <div
          className={cn(
            'transition-[max-height,opacity,margin] duration-200 ease-in-out',
            isOpen
              ? 'overflow-visible opacity-100 pt-2 border-t border-border/70 mt-1'
              : 'overflow-hidden max-h-0 opacity-0 pointer-events-none -mt-1',
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            {children}
          </div>
        </div>
      )}
    </section>
  )
}

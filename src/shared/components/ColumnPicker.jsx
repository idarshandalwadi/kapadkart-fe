import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'

function ColumnPicker({
  id,
  columns,
  visibleKeys,
  onToggle,
  onShowAll,
  onResetDefault,
  isDefault = false,
  disabled = false,
}) {
  const generatedId = useId()
  const triggerId = id || generatedId
  const menuId = `${triggerId}-menu`
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  const visibleCount = visibleKeys.length
  const allVisible = visibleCount === columns.length

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={cn('relative', open && 'z-50')} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={cn(
          'inline-flex h-[2.65rem] w-full items-center justify-center gap-[0.45rem] rounded-[9px] border border-border bg-white px-[0.95rem] text-[0.85rem] font-semibold text-text',
          'cursor-pointer transition-[background-color,border-color,color] duration-160',
          'enabled:hover:bg-accent-soft enabled:hover:border-[#f0d19a] enabled:hover:text-accent-text',
          'disabled:cursor-not-allowed disabled:opacity-45',
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <i className="fa-solid fa-table-columns" aria-hidden="true" />
        Columns
        {!allVisible && (
          <span className="rounded-full bg-accent-soft px-[0.45rem] py-[0.05rem] text-[0.72rem] font-bold text-accent-text">
            {visibleCount}
          </span>
        )}
        <i
          className={cn(
            'fa-solid fa-chevron-down text-[0.68rem] text-text-muted transition-transform duration-160',
            open && 'rotate-180 text-accent',
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="group"
          aria-labelledby={triggerId}
          className="absolute top-[calc(100%+0.35rem)] right-0 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-[10px] border border-border bg-white p-1.5 shadow-md"
        >
          <p className="m-0 px-2.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-text-muted">
            Visible columns
          </p>
          <ul className="m-0 max-h-64 list-none overflow-y-auto p-0">
            {columns.map((column) => {
              const checked = visibleKeys.includes(column.key)
              const lastVisible = checked && visibleCount <= 1
              return (
                <li key={column.key}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[0.9rem] text-text',
                      'transition-colors duration-160 hover:bg-surface-muted',
                      lastVisible && 'cursor-not-allowed opacity-70',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-[0.95rem] shrink-0 accent-accent"
                      checked={checked}
                      disabled={lastVisible}
                      onChange={() => onToggle(column.key)}
                    />
                    <span className="min-w-0">{column.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border px-1.5 pt-1.5">
            {onResetDefault && (
              <button
                type="button"
                className={cn(
                  'w-full cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 py-1.5 text-left text-[0.82rem] font-semibold text-text-secondary',
                  'transition-colors duration-160 hover:bg-surface-muted hover:text-text',
                  'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
                )}
                disabled={isDefault}
                onClick={onResetDefault}
              >
                Reset to default
              </button>
            )}
            <button
              type="button"
              className={cn(
                'w-full cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 py-1.5 text-left text-[0.82rem] font-semibold text-accent-text',
                'transition-colors duration-160 hover:bg-accent-soft',
                'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
              )}
              disabled={allVisible}
              onClick={onShowAll}
            >
              Show all columns
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColumnPicker

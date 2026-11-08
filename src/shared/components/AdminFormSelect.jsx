import { useEffect, useId, useRef, useState } from 'react'

/**
 * Simple single-select dropdown (replaces native <select> for consistent UI).
 */
export default function FormSelect({
  id,
  name,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  className = '',
  'aria-invalid': ariaInvalid,
}) {
  const generatedId = useId()
  const triggerId = id || generatedId
  const listboxId = `${triggerId}-listbox`
  const rootRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const selected = options.find((opt) => String(opt.value) === String(value))
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => String(opt.value) === String(value)),
  )

  useEffect(() => {
    if (!open) return undefined

    setHighlight(selectedIndex)

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, selectedIndex])

  const emitChange = (nextValue) => {
    onChange?.({
      target: { name, value: nextValue },
    })
    setOpen(false)
  }

  const onTriggerKeyDown = (event) => {
    if (disabled) return

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
      return
    }

    if (!open) return

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((prev) => Math.max(0, prev - 1))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((prev) => Math.min(options.length - 1, prev + 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const opt = options[highlight]
      if (opt) emitChange(opt.value)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={ariaInvalid}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev)
        }}
        onKeyDown={onTriggerKeyDown}
        className={[
          'flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-light px-3 py-2.5 text-left text-sm text-ink outline-none',
          'focus:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-60',
          open ? 'border-accent' : '',
        ].join(' ')}
      >
        <span className={selected ? 'font-medium' : 'text-muted'}>
          {selected?.label || placeholder}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-[0.7rem] text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-56 list-none overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {options.map((opt, index) => {
            const isSelected = String(opt.value) === String(value)
            const isHighlighted = index === highlight
            return (
              <li key={String(opt.value)} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm',
                    isHighlighted || isSelected
                      ? 'bg-accent/10 font-semibold text-accent'
                      : 'text-ink hover:bg-canvas',
                  ].join(' ')}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => emitChange(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected ? (
                    <i className="fa-solid fa-check text-[0.75rem]" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

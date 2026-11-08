import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'

/**
 * Single-field searchable combobox.
 * - Local filter over `options` by default
 * - Pass `onSearch` for async/server search (options are shown as provided)
 * - Options may set `disabled: true` to show but block selection
 */
function SearchableSelect({
  id,
  name,
  value = '',
  onChange,
  options = [],
  placeholder = 'Search…',
  emptyMessage = 'No matches',
  disabled = false,
  className = '',
  loading = false,
  onSearch,
  searchDelay = 300,
  clearable = true,
  'aria-invalid': ariaInvalid,
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const listboxId = `${inputId}-listbox`
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const asyncSearch = typeof onSearch === 'function'

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selected = options.find((opt) => String(opt.value) === String(value))
  const selectedDisplay = selected
    ? selected.hint
      ? `${selected.label} (${selected.hint})`
      : selected.label
    : ''
  const displayValue = open ? query : selectedDisplay || query

  const filteredOptions = useMemo(() => {
    if (asyncSearch || !query.trim()) return options
    const term = query.trim().toLowerCase()
    return options.filter((opt) => {
      const label = String(opt.label ?? '').toLowerCase()
      const hint = String(opt.hint ?? '').toLowerCase()
      return label.includes(term) || hint.includes(term)
    })
  }, [options, query, asyncSearch])

  const optionIndexForValue = (list, nextValue) => {
    const index = list.findIndex((opt) => String(opt.value) === String(nextValue))
    return index >= 0 ? index : 0
  }

  const firstEnabledIndex = (list) => list.findIndex((opt) => !opt.disabled)

  const moveHighlight = (delta) => {
    setHighlight((index) => {
      if (!filteredOptions.length) return 0
      let next = index
      for (let step = 0; step < filteredOptions.length; step += 1) {
        next = (next + delta + filteredOptions.length) % filteredOptions.length
        if (!filteredOptions[next]?.disabled) return next
      }
      return index
    })
  }

  useEffect(() => {
    if (!open || !asyncSearch) return undefined

    const delay = query.trim() ? searchDelay : 0
    const timer = setTimeout(() => {
      onSearch(query.trim())
    }, delay)

    return () => clearTimeout(timer)
  }, [open, query, asyncSearch, onSearch, searchDelay])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        if (selected) setQuery('')
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, selected])

  useEffect(() => {
    setHighlight((index) => {
      if (!filteredOptions.length) return 0
      if (filteredOptions[index] && !filteredOptions[index].disabled) {
        return Math.min(index, filteredOptions.length - 1)
      }
      const enabled = firstEnabledIndex(filteredOptions)
      return enabled >= 0 ? enabled : 0
    })
  }, [filteredOptions.length])

  useEffect(() => {
    if (!open) return
    const optionEl = listRef.current?.querySelector(`[data-option-index="${highlight}"]`)
    optionEl?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open, filteredOptions.length])

  const emitChange = (nextValue, option = null) => {
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
      option,
    })
  }

  const selectOption = (option) => {
    if (!option || option.disabled) return
    setQuery('')
    setOpen(false)
    emitChange(option.value, option)
  }

  const clearSelection = () => {
    setQuery('')
    emitChange('', null)
    setOpen(true)
    setHighlight(0)
    inputRef.current?.focus()
  }

  const openList = () => {
    if (disabled) return
    setOpen(true)
    if (selected) {
      setQuery('')
      setHighlight(optionIndexForValue(options, value))
      return
    }
    const enabled = firstEnabledIndex(filteredOptions)
    setHighlight(enabled >= 0 ? enabled : 0)
  }

  const handleInputChange = (event) => {
    setQuery(event.target.value)
    setOpen(true)
    setHighlight(0)
    if (value !== '' && value != null) {
      emitChange('', null)
    }
  }

  const handleKeyDown = (event) => {
    if (disabled) return

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        event.stopPropagation()
        if (!open) {
          openList()
          return
        }
        moveHighlight(1)
        return
      }
      case 'ArrowUp': {
        event.preventDefault()
        event.stopPropagation()
        if (!open) {
          openList()
          return
        }
        moveHighlight(-1)
        return
      }
      case 'Home': {
        if (!open || !filteredOptions.length) return
        event.preventDefault()
        {
          const enabled = firstEnabledIndex(filteredOptions)
          setHighlight(enabled >= 0 ? enabled : 0)
        }
        return
      }
      case 'End': {
        if (!open || !filteredOptions.length) return
        event.preventDefault()
        {
          let last = -1
          for (let i = filteredOptions.length - 1; i >= 0; i -= 1) {
            if (!filteredOptions[i].disabled) {
              last = i
              break
            }
          }
          setHighlight(last >= 0 ? last : filteredOptions.length - 1)
        }
        return
      }
      case 'Enter': {
        if (open && filteredOptions[highlight] && !filteredOptions[highlight].disabled) {
          event.preventDefault()
          selectOption(filteredOptions[highlight])
        }
        return
      }
      case 'Escape': {
        if (open) {
          event.preventDefault()
          setOpen(false)
          if (selected) setQuery('')
        }
        return
      }
      default:
        break
    }
  }

  const showClear = clearable && value !== '' && value != null
  const hasError = ariaInvalid === true || ariaInvalid === 'true'
  const activeOptionId =
    open && filteredOptions[highlight]
      ? `${inputId}-option-${highlight}`
      : undefined

  return (
    <div
      className={cn(
        'relative w-full',
        open && 'z-50',
        disabled && 'opacity-60',
        className,
      )}
      ref={rootRef}
    >
      <div
        className={cn(
          'flex h-[2.65rem] min-h-[2.65rem] w-full box-border items-center gap-2 rounded-[9px] border border-border bg-white px-3 transition-[border-color,box-shadow] duration-160',
          'focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(217,119,6,0.28)]',
          hasError &&
            'border-danger-text focus-within:border-danger-text focus-within:shadow-[0_0_0_3px_rgba(180,35,24,0.2)]',
          disabled && 'cursor-not-allowed',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={cn(
            'min-w-0 w-full appearance-none rounded-none border-0 bg-transparent p-0 text-[0.9rem] max-[640px]:text-[16px] font-normal text-text shadow-none outline-none ring-0',
            'placeholder:font-normal placeholder:text-text-muted',
            'focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none',
            disabled && 'cursor-not-allowed',
          )}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={ariaInvalid}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => openList()}
          onClick={() => openList()}
          onKeyDown={handleKeyDown}
        />
        {showClear ? (
          <button
            type="button"
            className="inline-flex size-[1.35rem] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text-muted hover:bg-surface-muted hover:text-text"
            aria-label="Clear selection"
            disabled={disabled}
            onClick={clearSelection}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        ) : (
          <i
            className={cn(
              'fa-solid fa-chevron-down shrink-0 text-[0.7rem] text-text-muted transition-transform duration-160',
              open && 'rotate-180 text-accent',
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-40 m-0 max-h-56 list-none overflow-y-auto rounded-[10px] border border-border bg-white p-1.5 shadow-md"
          role="listbox"
          aria-label={placeholder}
        >
          {filteredOptions.map((opt, index) => {
            const isActive = String(opt.value) === String(value)
            const isHighlighted = index === highlight
            const isOptionDisabled = Boolean(opt.disabled)
            return (
              <li
                key={`${String(opt.value)}-${opt.label}`}
                id={`${inputId}-option-${index}`}
                role="option"
                aria-selected={isActive}
                aria-disabled={isOptionDisabled}
                data-option-index={index}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={isOptionDisabled}
                  className={cn(
                    'flex w-full flex-col items-start justify-start gap-[0.15rem] sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 rounded-[7px] border-0 bg-transparent px-2.5 py-2.5 sm:py-2 text-left font-inherit text-[0.9rem] max-[640px]:text-[0.95rem] transition-colors duration-160',
                    isOptionDisabled
                      ? 'cursor-not-allowed text-text-muted opacity-55'
                      : 'cursor-pointer text-text',
                    !isOptionDisabled && isHighlighted && 'bg-surface-muted ring-2 ring-accent/35 ring-inset',
                    !isOptionDisabled && isActive && !isHighlighted && 'bg-accent-soft font-bold text-accent-text',
                    !isOptionDisabled && isActive && isHighlighted && 'bg-accent-soft font-bold text-accent-text',
                    isOptionDisabled && isHighlighted && 'bg-surface-muted/70',
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    if (!isOptionDisabled) selectOption(opt)
                  }}
                >
                  <span className="min-w-0 sm:truncate">{opt.label}</span>
                  {opt.hint ? (
                    <span
                      className={cn(
                        'shrink-0 text-[0.78rem] font-semibold sm:text-right',
                        isOptionDisabled ? 'text-danger-text/80' : 'text-text-muted',
                        isActive && !isOptionDisabled && 'text-inherit opacity-80',
                      )}
                    >
                      {opt.hint}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}

          {loading && (
            <li className="px-2.5 py-2.5 text-[0.85rem] text-text-muted" role="presentation">
              Searching…
            </li>
          )}

          {!loading && filteredOptions.length === 0 && (
            <li className="px-2.5 py-2.5 text-[0.85rem] text-text-muted" role="presentation">
              {emptyMessage}
            </li>
          )}
        </ul>
      )}

      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  )
}

export default SearchableSelect

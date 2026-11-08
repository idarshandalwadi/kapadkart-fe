import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'
import {
  formatDateDDMMYYYY,
  formatToISODate,
  parseDateParts,
} from '@/shared/utils/dateFormat'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad(n) {
  return String(n).padStart(2, '0')
}

function datePart(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

function timePart(value) {
  const match = String(value || '').match(/T(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

function ceilTimeSlot(value) {
  const [hoursRaw, minutesRaw] = String(value).split(':').map(Number)
  if (!Number.isFinite(hoursRaw) || !Number.isFinite(minutesRaw)) return value
  if (minutesRaw === 0 || minutesRaw === 30) {
    return `${pad(hoursRaw)}:${pad(minutesRaw)}`
  }
  if (minutesRaw < 30) return `${pad(hoursRaw)}:30`
  return `${pad((hoursRaw + 1) % 24)}:00`
}

function currentTimeValue() {
  const now = new Date()
  return ceilTimeSlot(`${pad(now.getHours())}:${pad(now.getMinutes())}`)
}

function formatTimeOption(value) {
  const [hours, minutes] = String(value).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function buildTimeOptions(currentValue) {
  const options = []
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      options.push(`${pad(hour)}:${pad(minute)}`)
    }
  }
  if (currentValue && !options.includes(currentValue)) {
    options.push(currentValue)
    options.sort()
  }
  return options
}

function TimeSelect({
  id,
  name,
  value,
  onChange,
  disabled,
  min,
  max,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
}) {
  const options = buildTimeOptions(value)

  return (
    <select
      id={id}
      name={name}
      value={value}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
      className="cursor-pointer min-w-0 w-full text-[0.85rem] font-medium px-2 py-[0.6rem] rounded-[9px] border border-border bg-white text-text hover:border-border-strong focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface-muted/50 transition-[border-color,box-shadow]"
      onChange={(event) => {
        onChange?.(event)
        event.currentTarget.blur()
      }}
    >
      <option value="">{disabled ? 'Time' : 'Select time'}</option>
      {options.map((time) => {
        if (min && time < min && time !== value) return null
        if (max && time > max && time !== value) return null
        return (
          <option key={time} value={time}>
            {formatTimeOption(time)}
          </option>
        )
      })}
    </select>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-4 h-4 text-text-muted pointer-events-none shrink-0', className)}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function ChevronLeftIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-4 h-4', className)}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-4 h-4', className)}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/**
 * Custom Date Input Component
 * - Formats display as DD/MM/YYYY (e.g. 10/09/2026)
 * - Opens an interactive calendar popover on click
 * - Direct text typing is disabled so users pick exclusively from the calendar
 * - Emits standard `YYYY-MM-DD` value on change
 */
export function DateInput({
  id,
  name,
  value = '',
  min,
  max,
  onChange,
  disabled = false,
  readOnly = false,
  placeholder = 'dd/mm/yyyy',
  className = '',
  clearable = true,
  'aria-invalid': ariaInvalid,
  dateInvalid,
  onFocus,
  onBlur,
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const isInvalid = Boolean(dateInvalid ?? ariaInvalid)
  const [open, setOpen] = useState(false)

  // Standardize values
  const isoValue = datePart(value)
  const minIso = datePart(min)
  const maxIso = datePart(max)

  const parsedValue = useMemo(() => parseDateParts(isoValue), [isoValue])
  const minParsed = useMemo(() => parseDateParts(minIso), [minIso])
  const maxParsed = useMemo(() => parseDateParts(maxIso), [maxIso])
  const displayString = useMemo(() => (parsedValue ? formatDateDDMMYYYY(isoValue) : ''), [parsedValue, isoValue])

  // Current view in calendar (month: 1-12, year: YYYY)
  const today = useMemo(() => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      iso: formatToISODate(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    }
  }, [])

  const [viewYear, setViewYear] = useState(() => {
    if (parsedValue) return parsedValue.year
    if (minParsed && today.year < minParsed.year) return minParsed.year
    if (maxParsed && today.year > maxParsed.year) return maxParsed.year
    return today.year
  })

  const [viewMonth, setViewMonth] = useState(() => {
    if (parsedValue) return parsedValue.month
    if (minParsed && viewYear === minParsed.year && today.month < minParsed.month) return minParsed.month
    if (maxParsed && viewYear === maxParsed.year && today.month > maxParsed.month) return maxParsed.month
    return today.month
  })

  const [placement, setPlacement] = useState({ align: 'left', side: 'bottom' })

  // Smart responsive placement detection to avoid viewport clipping on all screen sizes
  useEffect(() => {
    if (!open || !containerRef.current) return undefined

    const updatePlacement = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const popoverWidth = 305
      const popoverHeight = 330
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Auto-align left or right depending on proximity to viewport edge
      let align = 'left'
      if (rect.left + popoverWidth > viewportWidth - 12 && rect.right >= popoverWidth) {
        align = 'right'
      }

      // Auto-flip upward if not enough space below but sufficient space above
      let side = 'bottom'
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        side = 'top'
      }

      setPlacement({ align, side })
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement, { passive: true })
    window.addEventListener('scroll', updatePlacement, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open])

  // Year options for fast jump - ONLY include years between min and max
  const yearOptions = useMemo(() => {
    const currentY = today.year
    const minYearVal = minParsed ? minParsed.year : currentY - 10
    const maxYearVal = maxParsed ? maxParsed.year : currentY + 15
    const list = []
    for (let y = minYearVal; y <= maxYearVal; y += 1) {
      list.push(y)
    }
    return list.length > 0 ? list : [currentY]
  }, [minParsed, maxParsed, today.year])

  // Month options for current viewYear - ONLY include months supported by min and max
  const { startMonth, endMonth, monthOptions } = useMemo(() => {
    let start = 1
    let end = 12
    if (minParsed && viewYear === minParsed.year) {
      start = minParsed.month
    }
    if (maxParsed && viewYear === maxParsed.year) {
      end = maxParsed.month
    }
    if (minParsed && viewYear < minParsed.year) {
      start = 13
    }
    if (maxParsed && viewYear > maxParsed.year) {
      end = 0
    }

    const options = []
    for (let m = start; m <= end; m += 1) {
      if (m >= 1 && m <= 12) {
        options.push({ value: m, label: MONTH_NAMES[m - 1] })
      }
    }
    return { startMonth: start, endMonth: end, monthOptions: options }
  }, [minParsed, maxParsed, viewYear])

  // Clamp viewYear and viewMonth if they fall out of allowed range
  useEffect(() => {
    const minYearVal = minParsed ? minParsed.year : today.year - 10
    const maxYearVal = maxParsed ? maxParsed.year : today.year + 15

    if (viewYear < minYearVal) {
      setViewYear(minYearVal)
      return
    }
    if (viewYear > maxYearVal) {
      setViewYear(maxYearVal)
      return
    }

    if (viewMonth < startMonth) {
      setViewMonth(startMonth)
    } else if (viewMonth > endMonth) {
      setViewMonth(endMonth)
    }
  }, [viewYear, viewMonth, startMonth, endMonth, minParsed, maxParsed, today.year])

  // When value changes or picker opens, sync calendar view to current value
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year)
      setViewMonth(parsedValue.month)
    }
  }, [parsedValue?.year, parsedValue?.month])

  // Sync when opened if no value set
  useEffect(() => {
    if (open && !parsedValue) {
      const initialY = minParsed && today.year < minParsed.year ? minParsed.year : today.year
      const initialM = minParsed && initialY === minParsed.year && today.month < minParsed.month ? minParsed.month : today.month
      setViewYear(initialY)
      setViewMonth(initialM)
    }
  }, [open, parsedValue, minParsed, today.year, today.month])

  // Check if prev/next month navigation is possible
  const canPrevMonth = useMemo(() => {
    if (!minParsed) return true
    if (viewYear < minParsed.year) return false
    if (viewYear === minParsed.year && viewMonth <= minParsed.month) return false
    return true
  }, [minParsed, viewYear, viewMonth])

  const canNextMonth = useMemo(() => {
    if (!maxParsed) return true
    if (viewYear > maxParsed.year) return false
    if (viewYear === maxParsed.year && viewMonth >= maxParsed.month) return false
    return true
  }, [maxParsed, viewYear, viewMonth])

  // Click outside to close calendar
  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Handle month/year navigation
  const prevMonth = (e) => {
    e?.stopPropagation()
    if (!canPrevMonth) return
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = (e) => {
    e?.stopPropagation()
    if (!canNextMonth) return
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Select date handler
  const handleSelectDate = (isoDate) => {
    if (disabled || readOnly) return
    onChange?.({
      target: { id: inputId, name, value: isoDate },
      currentTarget: { id: inputId, name, value: isoDate },
    })
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleClear = (e) => {
    e?.stopPropagation()
    if (disabled || readOnly) return
    onChange?.({
      target: { id: inputId, name, value: '' },
      currentTarget: { id: inputId, name, value: '' },
    })
    setOpen(false)
  }

  const handleQuickToday = (e) => {
    e?.stopPropagation()
    if (minIso && today.iso < minIso) return
    if (maxIso && today.iso > maxIso) return
    handleSelectDate(today.iso)
  }

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const days = []
    const firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate()

    // Leading padding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
      const d = daysInPrevMonth - i
      const m = viewMonth === 1 ? 12 : viewMonth - 1
      const y = viewMonth === 1 ? viewYear - 1 : viewYear
      const iso = formatToISODate(y, m, d)
      const isDisabled = (minIso && iso < minIso) || (maxIso && iso > maxIso)
      days.push({
        day: d,
        month: m,
        year: y,
        iso,
        isCurrentMonth: false,
        isDisabled,
        isToday: iso === today.iso,
        isSelected: iso === isoValue,
      })
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = formatToISODate(viewYear, viewMonth, d)
      const isDisabled = (minIso && iso < minIso) || (maxIso && iso > maxIso)
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        iso,
        isCurrentMonth: true,
        isDisabled,
        isToday: iso === today.iso,
        isSelected: iso === isoValue,
      })
    }

    // Trailing padding days for complete grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7
    for (let d = 1; d <= remaining; d += 1) {
      const m = viewMonth === 12 ? 1 : viewMonth + 1
      const y = viewMonth === 12 ? viewYear + 1 : viewYear
      const iso = formatToISODate(y, m, d)
      const isDisabled = (minIso && iso < minIso) || (maxIso && iso > maxIso)
      days.push({
        day: d,
        month: m,
        year: y,
        iso,
        isCurrentMonth: false,
        isDisabled,
        isToday: iso === today.iso,
        isSelected: iso === isoValue,
      })
    }

    return days
  }, [viewYear, viewMonth, minIso, maxIso, today.iso, isoValue])

  const toggleOpen = () => {
    if (disabled || readOnly) return
    setOpen((prev) => !prev)
  }

  const handleKeyDown = (e) => {
    if (disabled || readOnly) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 w-full inline-block">
      {/* Input container */}
      <div
        className={cn(
          'relative flex items-center justify-between rounded-[9px] border bg-white transition-[border-color,box-shadow] duration-160 cursor-pointer select-none',
          disabled
            ? 'opacity-60 cursor-not-allowed bg-surface-muted/50 border-border'
            : isInvalid
              ? 'border-danger-text focus-within:border-danger-text focus-within:shadow-[0_0_0_3px_rgba(180,35,24,0.2)]'
              : open
                ? 'border-accent shadow-[0_0_0_3px_rgba(217,119,6,0.28)]'
                : 'border-border hover:border-border-strong focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(217,119,6,0.28)]',
        )}
        onClick={toggleOpen}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          readOnly
          disabled={disabled}
          value={displayString}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          aria-haspopup="dialog"
          aria-expanded={open}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'cursor-pointer w-full bg-transparent text-[0.85rem] font-medium text-text placeholder:text-text-muted/70 px-2.5 py-[0.6rem] outline-none border-0 ring-0 focus:ring-0 focus:outline-none select-none',
            className,
          )}
          {...props}
        />

        <div className="flex items-center gap-1 pr-2.5 shrink-0">
          {clearable && Boolean(isoValue) && !disabled && !readOnly && (
            <button
              type="button"
              tabIndex={-1}
              title="Clear date"
              onClick={handleClear}
              className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <CalendarIcon className={cn(open && 'text-accent')} />
        </div>
      </div>

      {/* Hidden input for standard form serialization if needed */}
      <input type="hidden" name={name ? `${name}_raw` : undefined} value={isoValue} />

      {/* Interactive Calendar Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Date Picker Calendar"
          className={cn(
            'absolute z-50 w-[290px] sm:w-[305px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-white p-3 shadow-xl animate-soft-in select-none',
            placement.side === 'top'
              ? 'bottom-[calc(100%+0.35rem)]'
              : 'top-[calc(100%+0.35rem)]',
            placement.align === 'right' ? 'right-0' : 'left-0',
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header: Month & Year controls */}
          <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-border/70">
            <button
              type="button"
              disabled={!canPrevMonth}
              onClick={prevMonth}
              title="Previous Month"
              className={cn(
                'size-8 sm:size-7 flex items-center justify-center rounded-lg text-text-secondary transition-colors',
                canPrevMonth
                  ? 'hover:text-text hover:bg-surface-muted cursor-pointer active:scale-95'
                  : 'opacity-25 cursor-not-allowed pointer-events-none',
              )}
            >
              <ChevronLeftIcon />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Select - only shows supported months */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="cursor-pointer text-[0.85rem] font-bold text-text bg-transparent border border-transparent py-1 px-1.5 rounded-md hover:bg-surface-muted focus:outline-none focus:bg-surface-muted transition-colors"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Year Select - only shows supported years */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="cursor-pointer text-[0.85rem] font-bold text-text bg-transparent border border-transparent py-1 px-1.5 rounded-md hover:bg-surface-muted focus:outline-none focus:bg-surface-muted transition-colors"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={!canNextMonth}
              onClick={nextMonth}
              title="Next Month"
              className={cn(
                'size-8 sm:size-7 flex items-center justify-center rounded-lg text-text-secondary transition-colors',
                canNextMonth
                  ? 'hover:text-text hover:bg-surface-muted cursor-pointer active:scale-95'
                  : 'opacity-25 cursor-not-allowed pointer-events-none',
              )}
            >
              <ChevronRightIcon />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-[0.72rem] font-bold text-text-muted uppercase tracking-wider py-0.5"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item) => {
              let dayStyles = ''

              if (item.isSelected) {
                dayStyles = 'bg-accent text-white font-bold shadow-xs hover:bg-accent-hover'
              } else if (item.isDisabled) {
                if (item.isToday) {
                  dayStyles =
                    'border border-border-strong text-text-muted/65 font-semibold bg-surface-muted/40 cursor-not-allowed pointer-events-none'
                } else if (item.isCurrentMonth) {
                  dayStyles =
                    'text-text-muted/50 font-normal cursor-not-allowed pointer-events-none'
                } else {
                  dayStyles =
                    'text-text-muted/25 font-normal cursor-not-allowed pointer-events-none'
                }
              } else if (item.isToday) {
                dayStyles =
                  'border-2 border-accent text-accent font-bold hover:bg-accent-soft/70 hover:text-accent-text'
              } else if (item.isCurrentMonth) {
                dayStyles =
                  'text-text font-semibold hover:bg-accent-soft hover:text-accent-text'
              } else {
                dayStyles =
                  'text-text-muted hover:bg-surface-muted hover:text-text font-normal'
              }

              return (
                <button
                  key={item.iso + (item.isCurrentMonth ? '-curr' : '-pad')}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleSelectDate(item.iso)}
                  className={cn(
                    'h-9 sm:h-8 w-full rounded-lg text-[0.82rem] transition-colors flex items-center justify-center cursor-pointer touch-manipulation',
                    dayStyles,
                  )}
                >
                  {item.day}
                </button>
              )
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[0.78rem]">
            <button
              type="button"
              onClick={handleQuickToday}
              disabled={(minIso && today.iso < minIso) || (maxIso && today.iso > maxIso)}
              className="font-bold text-accent hover:text-accent-hover hover:underline cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:no-underline disabled:text-text-muted py-1 px-1.5"
            >
              Today
            </button>

            <div className="flex items-center gap-2">
              {Boolean(isoValue) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-text-muted hover:text-danger-text transition-colors cursor-pointer font-medium py-1 px-1.5"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text font-medium px-2.5 py-1 rounded-md hover:bg-surface-muted cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Date + Time combined component
 * Emits standard `YYYY-MM-DDTHH:MM` value
 */
export function DateTimeLocalInput({
  id,
  name,
  value = '',
  min,
  max,
  onChange,
  disabled,
  'aria-invalid': ariaInvalid,
  dateInvalid,
  timeInvalid,
  className,
}) {
  const dateValue = datePart(value)
  const timeValue = timePart(value)
  const minDate = datePart(min)
  const maxDate = datePart(max)
  const minTime = dateValue && minDate && dateValue === minDate ? timePart(min) : undefined
  const maxTime = dateValue && maxDate && dateValue === maxDate ? timePart(max) : undefined
  const dateIsInvalid = dateInvalid ?? ariaInvalid
  const timeIsInvalid = timeInvalid ?? ariaInvalid

  const emit = (nextDate, nextTime) => {
    let time = nextTime
    if (nextDate && !time) {
      time = currentTimeValue()
      const nextMinTime = minDate && nextDate === minDate ? timePart(min) : undefined
      if (nextMinTime && time < nextMinTime) time = ceilTimeSlot(nextMinTime)
    }
    const combined = nextDate ? `${nextDate}T${time}` : ''
    onChange?.({
      target: { id, name, value: combined },
      currentTarget: { id, name, value: combined },
    })
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_6.75rem] min-[420px]:grid-cols-[minmax(0,1fr)_7.25rem] sm:grid-cols-[minmax(0,1fr)_7.5rem] gap-1.5 sm:gap-2 items-center',
        className,
      )}
    >
      <DateInput
        id={id}
        name={`${name}-date`}
        value={dateValue}
        min={minDate || undefined}
        max={maxDate || undefined}
        disabled={disabled}
        dateInvalid={dateIsInvalid}
        onChange={(event) => emit(event.target.value, timeValue)}
      />
      <TimeSelect
        id={id ? `${id}-time` : undefined}
        name={`${name}-time`}
        value={timeValue}
        min={minTime || undefined}
        max={maxTime || undefined}
        disabled={disabled || !dateValue}
        aria-invalid={timeIsInvalid}
        aria-label="Time"
        onChange={(event) => emit(dateValue, event.target.value)}
      />
    </div>
  )
}

export default DateInput


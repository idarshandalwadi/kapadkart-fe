import { hasDisplayValue } from './displayValue.js'

/**
 * Parse year, month (1-12), day safely from YYYY-MM-DD or Date object without timezone shift.
 */
export function parseDateParts(value) {
  if (!hasDisplayValue(value)) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    }
  }
  const str = String(value).trim()
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    if (year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day }
    }
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

/** Format YYYY-MM-DD from parts */
export function formatToISODate(year, month, day) {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Format as DD/MM/YYYY */
export function formatDateDDMMYYYY(value) {
  const parts = parseDateParts(value)
  if (!parts) return ''
  const day = String(parts.day).padStart(2, '0')
  const month = String(parts.month).padStart(2, '0')
  return `${day}/${month}/${parts.year}`
}

/** Display-only date: DD/MM/YYYY (returns '—' if empty) */
export function formatDateDisplay(value) {
  const formatted = formatDateDDMMYYYY(value)
  return formatted || '—'
}

/** Hover tooltip: date + time, e.g. 15/08/2026, 02:30 pm */
export function formatDateTimeTooltip(value) {
  if (!hasDisplayValue(value)) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}


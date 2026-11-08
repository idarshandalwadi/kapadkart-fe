/**
 * Normalize empty/missing table values so "null" never appears in the UI.
 */
export function hasDisplayValue(value) {
  if (value == null) return false
  const text = String(value).trim()
  if (!text) return false
  const lower = text.toLowerCase()
  return lower !== 'null' && lower !== 'undefined'
}

export function displayValue(value, fallback = '—') {
  return hasDisplayValue(value) ? String(value).trim() : fallback
}

/** Max letters shown for product names in compact listings. */
export const LISTING_NAME_MAX = 40

export function truncateListingText(value, max = LISTING_NAME_MAX, fallback = '—') {
  const text = displayValue(value, fallback)
  if (!hasDisplayValue(value) || text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

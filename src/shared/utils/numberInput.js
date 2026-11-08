/** True for 0, 0.0, 0.00, 00.00, etc. Incomplete values like "" or "." are not. */
export function isZeroLike(value) {
  const raw = String(value ?? '').trim()
  if (raw === '' || raw === '.') return false
  const n = Number(raw)
  return Number.isFinite(n) && n === 0
}

function stripLeadingZeros(intPart) {
  if (!intPart) return intPart
  return intPart.replace(/^0+(?=\d)/, '')
}

/**
 * Keep only an unsigned decimal string (no minus / exponent).
 * Allows at most one `.` and `maxDecimals` digits after it.
 * While typing, a trailing `.` is preserved (e.g. "10.").
 * Leading zeros in the integer part are stripped ("010" → "10", "00.50" → "0.50").
 */
export function sanitizeUnsignedDecimal(value, { maxDecimals = 2 } = {}) {
  const raw = String(value ?? '')
  if (raw === '') return ''

  const cleaned = raw.replace(/[^\d.]/g, '')
  if (!cleaned) return ''

  if (maxDecimals <= 0) {
    const digits = cleaned.replace(/\./g, '')
    if (!digits) return ''
    return stripLeadingZeros(digits)
  }

  const parts = cleaned.split('.')
  const intPart = stripLeadingZeros(parts[0] ?? '')
  if (parts.length === 1) return intPart

  const frac = parts.slice(1).join('').slice(0, maxDecimals)
  if (frac === '' && cleaned.endsWith('.')) {
    return `${intPart || '0'}.`
  }
  if (!frac) return intPart
  return `${intPart || '0'}.${frac}`
}

export function sanitizeUnsignedInteger(value) {
  return sanitizeUnsignedDecimal(value, { maxDecimals: 0 })
}

/** Block keys that browsers still allow on number fields: e/E, +, - */
export function preventInvalidNumberKeys(event, { integer = false } = {}) {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault()
    return
  }
  if (integer && event.key === '.') {
    event.preventDefault()
  }
}

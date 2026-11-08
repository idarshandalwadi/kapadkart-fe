/**
 * Build a UPI deep-link / QR payload from shop settings.
 * Accepts a VPA (`shop@oksbi`) or a full `upi://pay?...` string.
 */

function encode(value) {
  return encodeURIComponent(String(value ?? '').trim())
}

/**
 * @param {string} raw
 * @returns {string} VPA / pa value, or empty
 */
export function extractUpiVpa(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return ''

  if (/^upi:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const pa = url.searchParams.get('pa')
      return pa ? pa.trim() : ''
    } catch {
      const match = value.match(/[?&]pa=([^&]+)/i)
      return match ? decodeURIComponent(match[1]).trim() : ''
    }
  }

  return value
}

/**
 * @param {{
 *   upiId: string,
 *   payeeName?: string,
 *   amount?: number | string | null,
 *   billNo?: string | null,
 *   currency?: string,
 * }} options
 * @returns {string | null} upi://pay?... or null if no VPA
 */
export function buildUpiPaymentUri({
  upiId,
  payeeName = '',
  amount = null,
  billNo = null,
  currency = 'INR',
}) {
  const vpa = extractUpiVpa(upiId)
  if (!vpa) return null

  const parts = [`pa=${encode(vpa)}`]

  const name = String(payeeName || '').trim()
  if (name) parts.push(`pn=${encode(name)}`)

  const due = Number(amount)
  if (Number.isFinite(due) && due > 0) {
    parts.push(`am=${encode(due.toFixed(2))}`)
  }

  const cu = String(currency || 'INR').trim() || 'INR'
  parts.push(`cu=${encode(cu)}`)

  const note = String(billNo || '').trim()
  if (note) parts.push(`tn=${encode(note)}`)

  return `upi://pay?${parts.join('&')}`
}

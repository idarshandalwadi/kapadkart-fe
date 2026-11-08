import { formatDateDDMMYYYY } from './dateFormat.js'

/**
 * Normalize a phone number to WhatsApp international digits (no +).
 * Indian 10-digit numbers are prefixed with country code 91.
 */
export function normalizeWhatsAppPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''

  // Strip a single leading trunk 0 from numbers like 09876543210
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (digits.length === 10) return `91${digits}`
  return digits
}

/**
 * Build a default WhatsApp contact URL from a mobile number.
 * Returns '' when the phone has fewer than 10 digits.
 */
export function buildWhatsAppUrlFromPhone(phone) {
  const digits = normalizeWhatsAppPhone(phone)
  if (digits.length < 10) return ''
  return `https://wa.me/${digits}`
}

/**
 * Open WhatsApp chat with an optional prefilled message.
 * Indian 10-digit numbers are prefixed with country code 91.
 * Without a phone, opens WhatsApp so the user can pick a contact.
 */
export function openWhatsAppShare({ phone, message, targetWindow = null }) {
  const text = encodeURIComponent(message || '')
  const withCountry = normalizeWhatsAppPhone(phone)
  const url = withCountry
    ? `https://wa.me/${withCountry}?text=${text}`
    : `https://wa.me/?text=${text}`

  if (targetWindow && !targetWindow.closed) {
    targetWindow.opener = null
    targetWindow.location.href = url
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return { ok: true }
}

/**
 * Smart share: uses native Web Share API on mobile if available and no specific phone target,
 * otherwise falls back to WhatsApp.
 */
export async function shareWithNativeFallback({ title = 'KapadKart', text = '', url = '', phone = '' }) {
  if (!phone && typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title, text, url: url || undefined })
      return { ok: true, method: 'native' }
    } catch (err) {
      if (err.name === 'AbortError') return { ok: false, cancelled: true }
    }
  }
  return openWhatsAppShare({ phone, message: url ? `${text}\n${url}`.trim() : text })
}

function formatMoney(value) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value ?? '—')
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function saleProductNames(sale) {
  if (Array.isArray(sale.line_items)) {
    return sale.line_items.map((item) => item.product_name).filter(Boolean)
  }
  try {
    const parsed = JSON.parse(sale.selected_products || '')
    const items = Array.isArray(parsed) ? parsed : parsed?.items
    if (Array.isArray(items)) {
      return items.map((item) => item.product_name || item.name).filter(Boolean)
    }
  } catch {
    // Legacy free-text sale.
  }
  return []
}

export function buildSaleWhatsAppMessage(
  sale,
  companyName = 'KapadKart',
  { downloadUrl = '', contactNumber = '' } = {},
) {
  const customer = sale.customer_name || 'ગ્રાહક'
  const shopName = companyName || 'KapadKart'
  const billNo = sale.bill_no || '—'
  const dateStr = sale.created_at ? formatDateDDMMYYYY(sale.created_at) : ''
  const paidAmount = Number(sale.paid_amount ?? sale.sale_total ?? 0)

  const lines = [
    `*નમસ્તે, ${customer}*`,
    `*${shopName}* માંથી ખરીદી કરવા બદલ આપનો ખૂબ ખૂબ આભાર. આપના વેચાણ બિલની વિગત નીચે મુજબ છે:`,
    '',
    `*બિલ નંબર:* ${billNo}`,
  ]

  if (dateStr) {
    lines.push(`*તારીખ:* ${dateStr}`)
  }

  lines.push(`*કુલ ચૂકવેલ રકમ:* ${formatMoney(paidAmount)}`)
  lines.push(`*ચુકવણી સ્થિતિ:* સંપૂર્ણ ચૂકતે`)

  if (downloadUrl) {
    lines.push('', `*બિલ ડાઉનલોડ કરવા માટેની લિંક:*\n${downloadUrl}`)
  }

  lines.push('', 'અમારી મુલાકાત લેવા બદલ આપનો ખૂબ ખૂબ આભાર.')

  if (contactNumber) {
    lines.push(`*દુકાન સંપર્ક નંબર:* +91 ${contactNumber}`)
  }

  return lines.join('\n')
}

export function buildBookingWhatsAppMessage(
  booking,
  companyName = 'KapadKart',
  { downloadUrl = '', contactNumber = '' } = {},
) {
  const customer = booking.customer_name || 'ગ્રાહક'
  const billNo = booking.bill_no || '—'
  const totalAmount = Number(booking.rental_total ?? booking.grand_total ?? 0)
  const paidAmount = Number(booking.paid_amount ?? 0)
  const dueAmount = Number(booking.due_amount ?? 0)
  const taxAmount = Number(booking.tax_amount ?? 0)
  const deposit = Number(booking.security_deposit ?? 0)
  const pickupDate = booking.pickup_date ?? booking.order_date
  const returnDate = booking.return_date

  const lines = [
    `*નમસ્તે, ${customer}*`,
    `*${companyName}* માં આપનું સ્વાગત છે. આપના બુકિંગની વિગત નીચે મુજબ છે:`,
    '',
    `*બિલ નંબર (Bill No):* ${billNo}`,
  ]

  if (pickupDate) {
    const formattedPickup = formatDateDDMMYYYY(pickupDate)
    if (formattedPickup) {
      lines.push(`*પિકઅપ તારીખ (Pickup Date):* ${formattedPickup}`)
    }
  }
  if (returnDate) {
    const formattedReturn = formatDateDDMMYYYY(returnDate)
    if (formattedReturn) {
      lines.push(`*પરત તારીખ (Return Date):* ${formattedReturn}`)
    }
  }

  lines.push(`*કુલ રકમ (Total Amount):* ${formatMoney(totalAmount)}`)

  if (taxAmount > 0) {
    lines.push(`*GST ટેક્સ (GST Tax):* ${formatMoney(taxAmount)}`)
  }

  lines.push(`*જમા / એડવાન્સ (Advance / Paid):* ${formatMoney(paidAmount)}`)

  if (dueAmount > 0) {
    lines.push(`*બાકી રકમ (Due Amount):* ${formatMoney(dueAmount)}`)
  } else {
    lines.push(`*બાકી રકમ (Due Amount):* ₹0.00 (સંપૂર્ણ ચૂકતે)`)
  }

  if (deposit > 0) {
    const depStatus = booking.deposit_paid ? '(જમા થયેલ)' : '(બાકી)'
    lines.push(`*સુરક્ષા ડિપોઝિટ (Security Deposit):* ${formatMoney(deposit)} ${depStatus}`)
  }

  if (downloadUrl) {
    lines.push('', `*બિલ ડાઉનલોડ કરવા માટેની લિંક (Download Bill):*\n${downloadUrl}`)
  }

  lines.push('', 'અમારી મુલાકાત લેવા બદલ આપનો ખૂબ ખૂબ આભાર!')

  if (contactNumber) {
    lines.push(`*સંપર્ક (Contact):* +91 ${contactNumber}`)
  }

  return lines.join('\n')
}

export function buildProductWhatsAppMessage(
  product,
  companyName = 'KapadKart',
  { contactNumber = '' } = {},
) {
  const lines = [
    `*${companyName} — Product Details*`,
    '',
    `Product name: ${product.product_name || '—'}`,
    `Product code: ${product.product_code || '—'}`,
  ]
  if (product.daily_rent != null && product.daily_rent !== '') {
    lines.push(`Daily Rent: ${formatMoney(product.daily_rent)}`)
  }
  if (product.sale_price != null && product.sale_price !== '') {
    lines.push(`Sale Price: ${formatMoney(product.sale_price)}`)
  }
  lines.push('', 'Thank you for shopping with us!')
  if (contactNumber) lines.push(`Contact number: ${contactNumber}`)
  return lines.join('\n')
}

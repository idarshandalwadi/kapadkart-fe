import { truncateListingText } from '../../../shared/utils/displayValue.js'

const LINE_ITEMS_VERSION = 1

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function normalizeRentalDays(value) {
  const days = Math.trunc(Number(value))
  if (!Number.isFinite(days) || days < 1) return 1
  return days
}

/** Calculate rental days from pickup date and return date based on configured mode. */
export function calcRentalDaysFromDates(pickupDate, returnDate, mode = 'DIFF_2_DAYS') {
  const startDate = pickupDate
  if (!startDate || !returnDate) return 1
  const startDay = toLocalCalendarDate(startDate)
  const endDay = toLocalCalendarDate(returnDate)
  if (!startDay || !endDay || endDay < startDay) {
    return 1
  }

  const diffDays = Math.round((endDay - startDay) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 1

  const normalizedMode = String(mode || 'DIFF_2_DAYS').trim().toUpperCase()

  switch (normalizedMode) {
    case 'CALENDAR_DAYS':
    case 'SAME_DAY':
    case 'CASE_1':
      return diffDays + 1

    case 'DIFF_1_DAY':
    case 'NEXT_DAY':
    case 'CASE_2':
    case 'USE_TO_RETURN':
    case 'PICKUP_TO_RETURN':
      return Math.max(1, diffDays)

    case 'DIFF_2_DAYS':
    case 'TWO_DAY_DIFF':
    case 'CASE_3':
    default:
      return diffDays <= 2 ? 1 : diffDays - 1
  }
}

function toLocalCalendarDate(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match && (raw.length === 10 || raw[10] === 'T' || raw[10] === ' ')) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function calcLineTotal(quantity, unitPrice, rentalDays = 1) {
  const days = normalizeRentalDays(rentalDays)
  return roundMoney((Number(quantity) || 0) * (Number(unitPrice) || 0) * days)
}

export function calcRentalTotal(items = [], rentalDays = 1) {
  const days = normalizeRentalDays(rentalDays)
  return roundMoney(
    items.reduce((sum, item) => sum + calcLineTotal(item.quantity, item.unit_price, days), 0),
  )
}

export function calcTotalQuantity(items = []) {
  return (items || []).reduce((sum, item) => sum + Math.max(1, Math.trunc(Number(item.quantity) || 1)), 0)
}

/**
 * Booking amount breakdown:
 * Taxable = products + accessories − discount; tax is % of taxable.
 * Final Amount = (products + accessories − discount) + tax.
 * Due (Baki) = Final Amount − Paid.
 * Security deposit is held separately.
 */
export function calcBookingAmounts({
  items = [],
  rentalDays = 1,
  discountAmount = 0,
  taxRate = 0,
  accessoriesPrice = 0,
  securityDeposit = 0,
  paidAmount = 0,
} = {}) {
  const days = normalizeRentalDays(rentalDays)
  const totalQuantity = calcTotalQuantity(items)
  const productsSubtotal = calcRentalTotal(items, days)
  const accessories = Math.max(0, roundMoney(accessoriesPrice))
  const subtotal = roundMoney(productsSubtotal + accessories)
  const discount = Math.max(0, roundMoney(discountAmount))
  const cappedDiscount = Math.min(discount, subtotal)
  const taxable = roundMoney(Math.max(0, subtotal - cappedDiscount))
  const rate = Math.max(0, Number(taxRate) || 0)
  const taxAmount = roundMoney((taxable * rate) / 100)
  const rentalTotal = roundMoney(taxable + taxAmount)
  const deposit = Math.max(0, roundMoney(securityDeposit))
  const paid = Math.max(0, roundMoney(paidAmount))

  return {
    rental_days: days,
    total_quantity: totalQuantity,
    products_subtotal: productsSubtotal,
    accessories_price: accessories,
    subtotal,
    discount_amount: cappedDiscount,
    tax_rate: rate,
    tax_amount: taxAmount,
    security_deposit: deposit,
    rental_total: rentalTotal,
    paid_amount: paid,
    due_amount: roundMoney(Math.max(0, rentalTotal - paid)),
  }
}

/**
 * Recalculate totals from manually entered subtotal / tax (and related fields).
 * Final amount = (subtotal − discount) + tax; Due = Final − Paid.
 * Security deposit is tracked separately and is not part of Due.
 */
export function deriveAmountsFromOverrides({
  subtotal = 0,
  discountAmount = 0,
  taxAmount = 0,
  accessoriesPrice = 0,
  securityDeposit = 0,
  paidAmount = 0,
} = {}) {
  const sub = Math.max(0, roundMoney(subtotal))
  const accessories = Math.max(0, roundMoney(accessoriesPrice))
  const combinedSubtotal = roundMoney(sub + accessories)
  const discount = Math.min(Math.max(0, roundMoney(discountAmount)), combinedSubtotal)
  const taxable = Math.max(0, roundMoney(combinedSubtotal - discount))
  const tax = Math.max(0, roundMoney(taxAmount))
  const rentalTotal = roundMoney(taxable + tax)
  const deposit = Math.max(0, roundMoney(securityDeposit))
  const paid = Math.max(0, roundMoney(paidAmount))

  return {
    products_subtotal: sub,
    subtotal: sub,
    accessories_price: accessories,
    discount_amount: discount,
    tax_amount: tax,
    security_deposit: deposit,
    rental_total: rentalTotal,
    paid_amount: paid,
    due_amount: roundMoney(Math.max(0, rentalTotal - paid)),
  }
}

/** Final Amount is net after instant discount; Due = Final − Paid. */
export function resolvePayableAmounts({
  subtotal,
  taxAmount = 0,
  discountAmount = 0,
  paidAmount = 0,
  storedFinal = 0,
} = {}) {
  const tax = Math.max(0, roundMoney(taxAmount))
  const discount = Math.max(0, roundMoney(discountAmount))
  const paid = Math.max(0, roundMoney(paidAmount))
  const sub =
    subtotal !== '' && subtotal != null && !Number.isNaN(Number(subtotal))
      ? Math.max(0, roundMoney(subtotal))
      : null
  const finalAmount =
    sub != null
      ? roundMoney(Math.max(0, sub - discount) + tax)
      : roundMoney(Number(storedFinal) || 0)
  const dueAmount = roundMoney(Math.max(0, finalAmount - paid))
  return { finalAmount, dueAmount }
}

export function createLineItem(product, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1)
  const unitPrice = roundMoney(product.daily_rent ?? 0)
  const stock = Number(product.available_quantity ?? product.quantity)
  const item = {
    key: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: product.id,
    product_code: product.product_code || '',
    product_name: product.product_name || product.name || 'Product',
    image: product.image || product.image_url || null,
    image_url: product.image || product.image_url || null,
    product_image: product.image || product.image_url || null,
    product: product || null,
    quantity: qty,
    unit_price: unitPrice,
    line_total: calcLineTotal(qty, unitPrice, 1),
    choyani: '',
    pant: '',
    sol: '',
    mojdi: '',
    other_items: '',
  }

  if (Number.isFinite(stock) && stock >= 0) {
    item.max_quantity = stock
  }

  return item
}

export function normalizeLineItem(item) {
  if (!item) return null
  const quantity = Math.max(1, Number(item.quantity) || 1)
  const rawPrice = item.unit_price !== undefined ? item.unit_price : item.price
  const unitPrice = roundMoney(rawPrice)
  const prodName = item.product?.product_name || item.product_name || item.name || 'Product'
  const prodCode = item.product?.product_code || item.product_code || ''
  const prodId = item.product_id || item.product?.id || null
  const normalized = {
    key: item.key || item.id || `${prodId || 'item'}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: prodId,
    product_code: prodCode,
    product_name: prodName,
    quantity,
    unit_price: unitPrice,
    line_total:
      item.total_amount !== undefined
        ? roundMoney(item.total_amount)
        : calcLineTotal(quantity, unitPrice, 1),
    image: item.product?.image || item.image || item.image_url || null,
    image_url: item.product?.image || item.image || item.image_url || null,
    product_image: item.product?.image || item.image || item.image_url || null,
    product: item.product || null,
    choyani: String(item.choyani ?? ''),
    pant: String(item.pant ?? item.pent ?? ''),
    sol: String(item.sol ?? ''),
    mojdi: String(item.mojdi ?? item.shoe ?? ''),
    other_items: String(item.other_items ?? ''),
  }

  if (item.max_quantity != null && item.max_quantity !== '') {
    normalized.max_quantity = Number(item.max_quantity)
  }

  return normalized
}

export function serializeLineItems(items = [], rentalDays = 1) {
  if (!items.length) return ''

  const days = normalizeRentalDays(rentalDays)

  return JSON.stringify({
    version: LINE_ITEMS_VERSION,
    rental_days: days,
    items: items.map(({ key, ...item }) => ({
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name,
      image: item.product?.image || item.image || item.image_url || null,
      quantity: Number(item.quantity) || 1,
      unit_price: roundMoney(item.unit_price),
      line_total: calcLineTotal(item.quantity, item.unit_price, days),
      choyani: String(item.choyani ?? '').trim(),
      pant: String(item.pant ?? '').trim(),
      sol: String(item.sol ?? '').trim(),
      mojdi: String(item.mojdi ?? '').trim(),
      other_items: String(item.other_items ?? '').trim(),
    })),
  })
}

export function parseSelectedProducts(value) {
  if (!value) {
    return { items: [], legacyText: '', rentalDays: null }
  }

  if (Array.isArray(value)) {
    return {
      items: value.map(normalizeLineItem).filter(Boolean),
      legacyText: '',
      rentalDays: null,
    }
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.items) && value.items.length > 0) {
      return {
        items: value.items.map(normalizeLineItem).filter(Boolean),
        legacyText: value.legacy_products || value.legacyText || '',
        rentalDays: value.rental_days != null ? normalizeRentalDays(value.rental_days) : null,
      }
    }
    if (value.selected_products) {
      return parseSelectedProducts(value.selected_products)
    }
    return { items: [], legacyText: '', rentalDays: null }
  }

  if (typeof value !== 'string') {
    return { items: [], legacyText: '', rentalDays: null }
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return { items: [], legacyText: '', rentalDays: null }
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && Array.isArray(parsed.items)) {
      return {
        items: parsed.items.map(normalizeLineItem).filter(Boolean),
        legacyText: '',
        rentalDays: parsed.rental_days != null ? normalizeRentalDays(parsed.rental_days) : null,
      }
    }
    if (Array.isArray(parsed)) {
      return {
        items: parsed.map(normalizeLineItem).filter(Boolean),
        legacyText: '',
        rentalDays: null,
      }
    }
  } catch {
    // Legacy free-text bookings.
  }

  return { items: [], legacyText: trimmed, rentalDays: null }
}

export function formatLineItemsSummary(items = [], legacyText = '') {
  if (items.length) {
    return items
      .map((item) => {
        const code = item.product_code ? ` (${item.product_code})` : ''
        return `${item.product_name}${code} × ${item.quantity}`
      })
      .join(', ')
  }

  return legacyText || ''
}

export function formatLineItemsNames(items = [], legacyText = '') {
  if (items.length) {
    return items
      .map((item) => {
        const name = truncateListingText(item.product_name, undefined, 'Product')
        const code = item.product_code ? ` (${item.product_code})` : ''
        return `${item.product_name}${code} × ${item.quantity}`
      })
      .join('\n')
  }

  return legacyText || ''
}

export function totalLineItemsQuantity(items = []) {
  if (!items.length) return 0
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
}

export function formatSelectedProductsForDisplay(value) {
  const { items, legacyText } = parseSelectedProducts(value)
  return formatLineItemsSummary(items, legacyText) || '—'
}

/** Product names/codes only — no × quantity. */
export function formatSelectedProductsNames(value) {
  const { items, legacyText } = parseSelectedProducts(value)
  return formatLineItemsNames(items, legacyText) || '—'
}

export function totalSelectedProductsQuantity(value) {
  const { items, legacyText } = parseSelectedProducts(value)
  const total = totalLineItemsQuantity(items)
  if (total > 0) return total
  if (legacyText) {
    const matches = [...legacyText.matchAll(/(?:[x×\s*])\s*(\d+)/gi)]
    if (matches.length > 0) {
      const sum = matches.reduce((acc, m) => acc + (Number(m[1]) || 0), 0)
      if (sum > 0) return sum
    }
  }
  return null
}

const ACCESSORY_FIELDS = [
  { key: 'choyani', label: 'Choyni' },
  { key: 'pant', label: 'Pant', fallbacks: ['pent'] },
  { key: 'sol', label: 'Sholl' },
  { key: 'mojdi', label: 'Mojdi', fallbacks: ['shoe'] },
  { key: 'other_items', label: 'Other Items' },
]

/**
 * Accessory values as entered on booking/sale, for the bill details row.
 * Combined accessories price is shown in Payment, not on each accessory.
 */
function isMojdiNotApplicable(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
  return normalized === 'n/a' || normalized === 'na' || normalized === 'not applicable'
}

export function buildBillAccessoryFields(record = {}) {
  return ACCESSORY_FIELDS.map(({ key, label, fallbacks = [] }) => {
    const raw = [record[key], ...fallbacks.map((field) => record[field])].find(
      (value) => String(value ?? '').trim(),
    )
    const value = String(raw ?? '').trim()
    if (!value) return null
    if (key === 'mojdi' && isMojdiNotApplicable(value)) return null
    return { key, label, value }
  }).filter(Boolean)
}

export function formatItemAccessories(item = {}) {
  return buildBillAccessoryFields(item)
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join(' · ')
}

export function itemHasAccessories(item = {}) {
  return ['choyani', 'pant', 'sol', 'mojdi', 'other_items'].some((key) =>
    String(item[key] ?? '').trim(),
  )
}

import { FIELD_LIMITS, maxLengthMessage } from '../../../shared/constants/fieldLimits.js'

export const SALE_STATUS_OPTIONS = ['completed', 'cancelled']
export const SALE_LIMIT_OPTIONS = [5, 10, 20, 50]

export const SALE_TABLE_COLUMNS = [
  { key: 'bill_no', label: 'Bill No', sortKey: 'bill_no' },
  { key: 'date', label: 'Date', sortKey: 'created_at' },
  { key: 'customer', label: 'Customer', sortKey: 'customer_name' },
  { key: 'phone', label: 'Phone', sortKey: 'phone_number' },
  { key: 'products', label: 'Products' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'subtotal', label: 'Subtotal', align: 'right' },
  { key: 'discount', label: 'Discount', sortKey: 'discount_amount', align: 'right' },
  { key: 'total', label: 'Final Amount', sortKey: 'sale_total', align: 'right' },
  { key: 'paid', label: 'Paid Amount', sortKey: 'paid_amount', align: 'right' },
  { key: 'status', label: 'Status', sortKey: 'status' },
]

export const EMPTY_SALE_FORM = {
  bill_no: '',
  customer_name: '',
  phone_number: '',
  village_address: '',
  status: 'completed',
  selected_products: '',
  line_items: [],
  total_quantity: '0',
  subtotal: '',
  discount_amount: '',
  tax_rate: '',
  tax_amount: '',
  sale_total: '',
  paid_amount: '',
  notes: '',
}

export function saleStatusLabel(status) {
  return String(status)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const SALE_STATUS_BADGE_COLORS = {
  completed: 'bg-success-bg text-success-text',
  cancelled: 'bg-danger-bg text-danger-text',
}

export function saleStatusBadgeClasses(status) {
  const key = String(status || '').toLowerCase()
  return SALE_STATUS_BADGE_COLORS[key] || 'bg-neutral-bg text-neutral-text'
}

const PHONE_REGEX = /^[6-9]\d{9}$/

export function validateSaleForm(form) {
  const errors = {}

  const customerName = form.customer_name?.trim() ?? ''
  if (!customerName) {
    errors.customer_name = 'Customer name is required'
  } else if (customerName.length < 2) {
    errors.customer_name = 'Customer name must be at least 2 characters'
  } else if (String(form.customer_name || '').length > FIELD_LIMITS.customer_name) {
    errors.customer_name = maxLengthMessage('Customer name', FIELD_LIMITS.customer_name)
  }

  const phone = form.phone_number?.trim() ?? ''
  if (!phone) {
    errors.phone_number = 'Phone number is required'
  } else if (!PHONE_REGEX.test(phone)) {
    errors.phone_number = 'Please enter a valid 10-digit mobile number'
  }

  const lineItems = Array.isArray(form.line_items) ? form.line_items : []
  if (lineItems.length === 0) {
    errors.selected_products = 'Please add at least one product'
  } else {
    const invalidQty = lineItems.some((item) => {
      const q = Number(item.quantity)
      return !Number.isFinite(q) || !Number.isInteger(q) || q < 1
    })
    const overStock = lineItems.some((item) => {
      const max = Number(item.max_quantity)
      return Number.isFinite(max) && Number(item.quantity) > max
    })
    const invalidPrice = lineItems.some((item) => {
      const p = item.unit_price === '' || item.unit_price === null || item.unit_price === undefined
        ? 0
        : Number(item.unit_price)
      return !Number.isFinite(p) || p <= 0
    })

    if (invalidQty) {
      errors.selected_products = 'Each item quantity must be at least 1'
    } else if (overStock) {
      errors.selected_products = 'Item quantity cannot exceed available stock'
    } else if (invalidPrice) {
      errors.selected_products = 'Each item unit price must be greater than 0 before creating a sale'
    }
  }

  const subtotal = Number(form.subtotal) || 0
  const discountRaw = form.discount_amount
  const discountIsEmpty = discountRaw === '' || discountRaw === null || discountRaw === undefined
  const discountAmount = discountIsEmpty ? 0 : Number(discountRaw)

  if (!discountIsEmpty && (Number.isNaN(discountAmount) || discountAmount < 0)) {
    errors.discount_amount = 'Discount must be a valid amount (0 or more)'
  } else if (!discountIsEmpty && discountAmount > subtotal) {
    errors.discount_amount = 'Discount cannot exceed subtotal'
  }

  const saleTotal = Number(form.sale_total) || 0
  if (form.sale_total === '' || form.sale_total === null || form.sale_total === undefined) {
    errors.sale_total = 'Final amount is required'
  } else if (Number.isNaN(saleTotal) || saleTotal <= 0) {
    errors.sale_total = 'Final amount must be greater than 0'
  }

  const paidRaw = form.paid_amount
  const paidIsEmpty = paidRaw === '' || paidRaw === null || paidRaw === undefined
  const paidAmount = paidIsEmpty ? 0 : Number(paidRaw)

  const grossBillTotal = subtotal + (Number(form.tax_amount) || 0)
  if (!paidIsEmpty && (Number.isNaN(paidAmount) || paidAmount < 0)) {
    errors.paid_amount = 'Paid amount must be a valid amount (0 or more)'
  } else if (!paidIsEmpty && paidAmount > grossBillTotal + 0.01) {
    errors.paid_amount = 'Paid amount cannot exceed total bill amount'
  }

  if (String(form.village_address || '').length > FIELD_LIMITS.village_address) {
    errors.village_address = maxLengthMessage('Village / address', FIELD_LIMITS.village_address)
  }
  if (String(form.notes || '').length > FIELD_LIMITS.notes) {
    errors.notes = maxLengthMessage('Notes', FIELD_LIMITS.notes)
  }

  return errors
}

export const EDIT_SALE_MAX_DAYS = 30
export const CANCEL_SALE_MAX_DAYS = 45

export function getSaleAgeInDays(createdAt, now = Date.now()) {
  if (!createdAt) return 0
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return 0
  const currentTime = now instanceof Date ? now.getTime() : Number(now)
  const diffMs = currentTime - createdTime
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24))
}

export function isSaleEditable(sale, now = Date.now()) {
  if (!sale || sale.status === 'cancelled') return false
  const age = getSaleAgeInDays(sale.created_at, now)
  return age <= EDIT_SALE_MAX_DAYS
}

export function isSaleCancellable(sale, now = Date.now()) {
  if (!sale || sale.status === 'cancelled') return false
  const age = getSaleAgeInDays(sale.created_at, now)
  return age <= CANCEL_SALE_MAX_DAYS
}

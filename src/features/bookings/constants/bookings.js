import { FIELD_LIMITS, maxLengthMessage } from '@/shared/constants/fieldLimits'

export const BOOKING_STATUS_OPTIONS = [
  'reserved',
  'picked_up',
  'returned',
  'completed',
  'cancelled',
]

export const BOOKING_LIMIT_OPTIONS = [5, 10, 20, 50]

export const BOOKING_TABLE_COLUMNS = [
  { key: 'bill_no', label: 'Bill No' },
  { key: 'customer', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'booking_date', label: 'Booking Date' },
  { key: 'pickup_date', label: 'Pickup Date' },
  { key: 'return_date', label: 'Return Date' },
  { key: 'products', label: 'Products' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'paid', label: 'Paid (Jama)', align: 'right' },
  { key: 'due', label: 'Due (Baki)', align: 'right' },
]

export const EMPTY_BOOKING_FORM = {
  bill_no: '',
  customer_name: '',
  phone_number: '',
  extra_phone_number: '',
  village_address: '',
  status: 'reserved',
  choyani: '',
  mojdi: '',
  pant: '',
  sol: '',
  accessories_price: '',
  pickup_date: '',
  use_date: '',
  return_date: '',
  rental_days: '1',
  rental_day_calculation_mode: 'DIFF_1_DAY',
  selected_products: '',
  line_items: [],
  total_quantity: '0',
  legacy_products: '',
  subtotal: '',
  discount_amount: '',
  tax_rate: '',
  tax_amount: '',
  security_deposit: '',
  deposit_paid: false,
  payment_method: 'CASH',
  rental_total: '',
  paid_amount: '',
  due_amount: '',
  notes: '',
}

export function bookingStatusLabel(status) {
  return String(status)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const BOOKING_STATUS_BADGE_COLORS = {
  reserved: 'bg-info-bg text-info-text',
  picked_up: 'bg-warning-bg text-warning-text',
  returned: 'bg-accent-soft text-accent-text',
  completed: 'bg-success-bg text-success-text',
  cancelled: 'bg-danger-bg text-danger-text',
}

export function bookingStatusBadgeClasses(status) {
  const key = String(status || '').toLowerCase()
  return (
    BOOKING_STATUS_BADGE_COLORS[key] || 'bg-neutral-bg text-neutral-text'
  )
}

/** True once the rental return datetime has passed while not yet fully returned. */
export function isRentalOverdue(booking) {
  const status = String(booking?.status || '').toLowerCase()
  if (status === 'returned' || status === 'completed' || status === 'cancelled') return false
  if (!booking?.return_date) return false
  const end = new Date(booking.return_date)
  if (Number.isNaN(end.getTime())) return false
  return end < new Date()
}

/**
 * Centralized lifecycle state calculation for a booking.
 */
export function getBookingLifecycleState(booking) {
  if (!booking) return 'RESERVED'
  const status = String(booking.status || '').toLowerCase()

  if (status === 'cancelled') return 'CANCELLED'
  if (status === 'returned' || status === 'completed') return 'RETURNED'
  if (status === 'partially_returned') return 'PARTIALLY_RETURNED'

  if (isRentalOverdue(booking)) {
    return 'OVERDUE'
  }

  if (status === 'sent') {
    return 'ACTIVE'
  }

  const pickup = booking.pickup_date || booking.use_date
  if (pickup) {
    const pickupDayStr = toDateInputValue(pickup)
    const todayStr = getDateInputToday()

    if (pickupDayStr && pickupDayStr <= todayStr) {
      return 'PICKUP_DUE'
    }
  }

  return 'RESERVED'
}

export function bookingLifecycleLabel(state) {
  switch (state) {
    case 'RESERVED':
      return 'Reserved'
    case 'PICKUP_DUE':
      return 'Ready for Pickup'
    case 'ACTIVE':
      return 'Dispatched'
    case 'OVERDUE':
      return 'Overdue'
    case 'PARTIALLY_RETURNED':
      return 'Partially Returned'
    case 'RETURNED':
      return 'Returned'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return state || 'Reserved'
  }
}

/**
 * Returns available lifecycle actions for a booking based on standard ERP business rules.
 */
export function getBookingAvailableActions(booking) {
  const state = getBookingLifecycleState(booking)
  const status = String(booking?.status || '').toLowerCase()
  const isUndispatched = status === 'booked' || (!status && state !== 'ACTIVE')

  switch (state) {
    case 'RESERVED':
      return {
        canSend: false,
        canEdit: true,
        canDelete: true,
        canReturn: false,
        canPrint: true,
        canWhatsApp: true,
        lifecycleState: 'RESERVED',
      }

    case 'PICKUP_DUE':
      return {
        canSend: true,
        canEdit: true,
        canDelete: true,
        canReturn: false,
        canPrint: true,
        canWhatsApp: true,
        lifecycleState: 'PICKUP_DUE',
      }

    case 'ACTIVE':
      return {
        canSend: false,
        canEdit: false,
        canDelete: false,
        canReturn: true,
        canPrint: true,
        canWhatsApp: true,
        lifecycleState: 'ACTIVE',
      }

    case 'OVERDUE':
      return {
        canSend: isUndispatched,
        canEdit: isUndispatched,
        canDelete: isUndispatched,
        canReturn: true,
        canPrint: true,
        canWhatsApp: true,
        lifecycleState: 'OVERDUE',
      }

    case 'PARTIALLY_RETURNED':
      return {
        canSend: false,
        canEdit: false,
        canDelete: false,
        canReturn: true,
        canPrint: true,
        canWhatsApp: true,
        lifecycleState: 'PARTIALLY_RETURNED',
      }

    case 'RETURNED':
    case 'CANCELLED':
    default:
      return {
        canSend: false,
        canEdit: false,
        canDelete: false,
        canReturn: false,
        canPrint: true,
        canWhatsApp: true,
        lifecycleState: state,
      }
  }
}

/** Returned, dispatched, or cancelled bookings are locked from editing. */
export function isBookingLocked(status, booking) {
  if (booking) {
    return !getBookingAvailableActions(booking).canEdit
  }
  const key = String(status || '').toLowerCase()
  return (
    key === 'returned' ||
    key === 'completed' ||
    key === 'cancelled' ||
    key === 'sent' ||
    key === 'partially_returned'
  )
}

const PHONE_REGEX = /^\d{10}$/

export function validateBookingForm(form, options = {}) {
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
    errors.phone_number = 'Phone number must be exactly 10 digits'
  }

  const extraPhone = form.extra_phone_number?.trim() ?? ''
  if (extraPhone && !PHONE_REGEX.test(extraPhone)) {
    errors.extra_phone_number = 'Extra phone must be exactly 10 digits'
  }

  const address = form.village_address?.trim() ?? ''
  if (!address) {
    errors.village_address = 'Village / address is required'
  } else if (String(form.village_address || '').length > FIELD_LIMITS.village_address) {
    errors.village_address = maxLengthMessage('Village / address', FIELD_LIMITS.village_address)
  }

  const pickupVal = form.pickup_date || form.use_date
  if (!pickupVal) {
    errors.pickup_date = 'Pickup date is required'
  } else if (Number.isNaN(new Date(pickupVal).getTime())) {
    errors.pickup_date = 'Pickup date is invalid'
  } else {
    const pickupDay = toDateInputValue(pickupVal)
    const today = getDateInputToday()
    const hasTime = /T\d{2}:\d{2}/.test(String(pickupVal))

    if (options.requireFutureUseDate && pickupDay && pickupDay < today) {
      errors.pickup_date = 'Pickup date cannot be in the past'
    } else if (!hasTime) {
      errors.pickup_time = 'Pickup time is required'
    } else if (options.requireFutureUseDate) {
      const pickupDate = new Date(pickupVal)
      const now = new Date()
      now.setSeconds(0, 0)
      if (pickupDate < now) {
        errors.pickup_time = 'Pickup time cannot be in the past'
      }
    }
  }

  if (!form.return_date) {
    errors.return_date = 'Return date is required'
  } else if (Number.isNaN(new Date(form.return_date).getTime())) {
    errors.return_date = 'Return date is invalid'
  }

  const hasPickup = pickupVal && !Number.isNaN(new Date(pickupVal).getTime())
  const hasReturn = form.return_date && !Number.isNaN(new Date(form.return_date).getTime())

  if (hasPickup && hasReturn) {
    const pickupDate = new Date(pickupVal)
    const returnDate = new Date(form.return_date)
    if (returnDate < pickupDate) {
      errors.return_date = 'Return date cannot be before pickup date'
    }
  }

  const rentalDaysRaw = form.rental_days
  const rentalDaysEmpty =
    rentalDaysRaw === '' || rentalDaysRaw === null || rentalDaysRaw === undefined
  const rentalDays = Number(rentalDaysRaw)
  if (rentalDaysEmpty) {
    errors.rental_days = 'Rental days is required'
  } else if (!Number.isFinite(rentalDays) || rentalDays < 1 || !Number.isInteger(rentalDays)) {
    errors.rental_days = 'Rental days must be a whole number of at least 1'
  }

  const lineItems = Array.isArray(form.line_items) ? form.line_items : []
  const selectedProducts = form.selected_products?.trim() ?? ''
  if (lineItems.length === 0 && !selectedProducts) {
    errors.selected_products = 'Add at least one product to the bill'
  } else if (lineItems.length > 0) {
    const invalidQty = lineItems.some(
      (item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1,
    )
    const overStock = lineItems.some((item) => {
      const max = Number(item.max_quantity)
      return Number.isFinite(max) && Number(item.quantity) > max
    })
    const invalidPrice = lineItems.some(
      (item) => !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) <= 0,
    )
    if (invalidQty) {
      errors.selected_products = 'Each item quantity must be at least 1'
    } else if (overStock) {
      errors.selected_products = 'Item quantity cannot exceed available stock'
    } else if (invalidPrice) {
      errors.selected_products = 'Rental price must be greater than 0'
    }
  }

  if (form.rental_total === '' || form.rental_total === null || form.rental_total === undefined) {
    errors.rental_total = 'Rental total is required'
  } else if (Number.isNaN(Number(form.rental_total)) || Number(form.rental_total) < 0) {
    errors.rental_total = 'Rental total must be a valid amount (0 or more)'
  }

  const discountRaw = form.discount_amount
  const discountIsEmpty = discountRaw === '' || discountRaw === null || discountRaw === undefined
  const discountAmount = discountIsEmpty ? 0 : Number(discountRaw)
  const subtotal = Number(form.subtotal)

  if (!discountIsEmpty && (Number.isNaN(discountAmount) || discountAmount < 0)) {
    errors.discount_amount = 'Discount must be a valid amount (0 or more)'
  } else if (
    !discountIsEmpty &&
    !Number.isNaN(subtotal) &&
    discountAmount > subtotal
  ) {
    errors.discount_amount = 'Discount cannot be greater than subtotal'
  }

  const depositRaw = form.security_deposit
  const depositIsEmpty = depositRaw === '' || depositRaw === null || depositRaw === undefined
  const depositAmount = depositIsEmpty ? 0 : Number(depositRaw)

  if (!depositIsEmpty && (Number.isNaN(depositAmount) || depositAmount < 0)) {
    errors.security_deposit = 'Deposit amount must be 0 or more'
  }

  const paidRaw = form.paid_amount
  const paidIsEmpty = paidRaw === '' || paidRaw === null || paidRaw === undefined
  const paidAmount = paidIsEmpty ? 0 : Number(paidRaw)
  const rentalTotal = Number(form.rental_total)
  const isCreate = Boolean(options.isCreate ?? !options.isEdit)

  if (isCreate) {
    if (paidIsEmpty || Number.isNaN(paidAmount) || paidAmount <= 0) {
      errors.paid_amount = 'Advance rent paid (Jama) is required and must be greater than 0'
    } else if (!Number.isNaN(rentalTotal) && paidAmount > rentalTotal) {
      errors.paid_amount = 'Paid amount cannot be greater than final amount'
    }
  } else {
    if (!paidIsEmpty && (Number.isNaN(paidAmount) || paidAmount < 0)) {
      errors.paid_amount = 'Paid amount must be a valid amount (0 or more)'
    } else if (!Number.isNaN(rentalTotal) && paidAmount > rentalTotal) {
      errors.paid_amount = 'Paid amount cannot be greater than final amount'
    }
  }

  if (String(form.choyani || '').length > FIELD_LIMITS.choyani) {
    errors.choyani = maxLengthMessage('Choyni', FIELD_LIMITS.choyani)
  }
  if (String(form.pant || '').length > FIELD_LIMITS.pant) {
    errors.pant = maxLengthMessage('Pant', FIELD_LIMITS.pant)
  }
  if (String(form.sol || '').length > FIELD_LIMITS.sol) {
    errors.sol = maxLengthMessage('Sholl', FIELD_LIMITS.sol)
  }
  if (String(form.notes || '').length > FIELD_LIMITS.notes) {
    errors.notes = maxLengthMessage('Notes', FIELD_LIMITS.notes)
  }

  return errors
}

export function toDateInputValue(value) {
  if (!value) return ''
  const raw = String(value).trim()
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (dateOnly && (raw.length === 10 || raw[10] === 'T' || raw[10] === ' ')) {
    return dateOnly[1]
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return dateOnly ? dateOnly[1] : ''

  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getDateInputToday() {
  return toDateInputValue(new Date())
}

export function getDateInputMax(year = 2050) {
  return `${year}-12-31`
}

export function sanitizeDateInputValue(value, { min, max } = {}) {
  const next = toDateInputValue(value)
  if (!next) return ''
  if (min && next < min) return min
  if (max && next > max) return max
  return next
}

export function fromDateInputValue(value) {
  const day = toDateInputValue(value)
  if (!day) return ''
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return ''
  return new Date(year, month - 1, date, 0, 0, 0, 0).toISOString()
}

export function toDatetimeLocalValue(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getDatetimeLocalNow() {
  return toDatetimeLocalValue(new Date())
}

export function getDatetimeLocalMax(year = 2050) {
  return `${year}-12-31T23:59`
}

/**
 * Rounds a date up to the next 30-minute block:
 * 13:01 -> 13:30, 13:25 -> 13:30, 13:31 -> 14:00
 */
export function getNext30MinuteDate(sourceDate = new Date()) {
  const d = new Date(sourceDate)
  d.setSeconds(0, 0)
  const minutes = d.getMinutes()
  if (minutes === 0) {
    // already on the hour
    return d
  }
  if (minutes <= 30) {
    d.setMinutes(30)
  } else {
    d.setMinutes(0)
    d.setHours(d.getHours() + 1)
  }
  return d
}

/**
 * Returns default pickup datetime rounded up to next 30 minutes from now.
 */
export function getDefaultPickupDatetime() {
  return toDatetimeLocalValue(getNext30MinuteDate())
}

/**
 * Returns default return datetime (1 day after pickup by default, same hour/minute).
 */
export function getDefaultReturnDatetime(pickupDatetimeLocalStr) {
  const pickup = pickupDatetimeLocalStr ? new Date(pickupDatetimeLocalStr) : getNext30MinuteDate()
  if (Number.isNaN(pickup.getTime())) {
    const fallback = getNext30MinuteDate()
    fallback.setDate(fallback.getDate() + 1)
    return toDatetimeLocalValue(fallback)
  }
  const ret = new Date(pickup)
  ret.setDate(ret.getDate() + 1)
  return toDatetimeLocalValue(ret)
}

export function sanitizeDatetimeLocalValue(value, { min, max } = {}) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const minYear = 2000
  const maxYear = 2050

  if (year < minYear || year > maxYear) {
    return min || getDatetimeLocalNow()
  }

  let next = toDatetimeLocalValue(date)
  if (min && next < min) next = min
  if (max && next > max) next = max
  return next
}

export function fromDatetimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

export function getDatetimeTomorrow(hour = 11, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return toDatetimeLocalValue(d)
}

export function getDatetimeDayAfterTomorrow(hour = 11, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  d.setHours(hour, minute, 0, 0)
  return toDatetimeLocalValue(d)
}

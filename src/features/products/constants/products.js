export const STATUS_OPTIONS = ['Available', 'Reserved', 'Out of Stock', 'Discontinued']
export const GENDER_OPTIONS = ['Male', 'Female', 'Kids', 'Unisex']
export const LIMIT_OPTIONS = [5, 10, 20, 50, 100]

export const PRODUCT_TABLE_COLUMNS = [
  { key: 'image', label: 'Image' },
  { key: 'product', label: 'Product' },
  { key: 'code', label: 'Code' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'gender', label: 'Gender' },
  { key: 'color', label: 'Color' },
  { key: 'size', label: 'Size' },
  { key: 'daily', label: 'Daily' },
  { key: 'sale', label: 'Sale' },
  { key: 'qty', label: 'Qty' },
  { key: 'for', label: 'For' },
  { key: 'status', label: 'Status' },
]

/** Default visible columns for product listing table (Required fields + Status). */
export const DEFAULT_PRODUCT_VISIBLE_COLUMNS = [
  'image',
  'product',
  'code',
  'category',
  'size',
  'status',
]

/** Qty at or below this (and still > 0) counts as low stock. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 3

export const LOW_STOCK_THRESHOLD_OPTIONS = [1, 2, 3, 5, 10]

export const STOCK_FILTER_OPTIONS = [
  { value: '', label: 'All stock' },
  { value: 'alerts', label: 'Stock alerts' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'in_stock', label: 'In stock' },
]

export const AVAILABILITY_TYPE_OPTIONS = [
  { value: 'rent', label: 'Rent only' },
  { value: 'sell', label: 'Sell only' },
  { value: 'both', label: 'Rent & Sell' },
]

export function availabilityFlagsFromType(type) {
  const value = String(type || 'rent').toLowerCase()
  return {
    for_rental: value === 'rent' || value === 'both',
    for_sale: value === 'sell' || value === 'both',
  }
}

export function availabilityTypeFromFlags({ for_rental, for_sale }) {
  if (for_rental && for_sale) return 'both'
  if (for_sale) return 'sell'
  if (for_rental) return 'rent'
  return ''
}

export function getTenantAvailabilityDefaults(businessType) {
  const type = String(businessType || 'SALES_AND_RENTAL').toUpperCase()
  if (type === 'RENTAL') {
    return { for_rental: true, for_sale: false }
  }
  if (type === 'SALES') {
    return { for_rental: false, for_sale: true }
  }
  return { for_rental: true, for_sale: true }
}

export const EMPTY_PRODUCT_FORM = {
  product_name: '',
  product_code: '',
  size: '',
  images: [],
  category: '',
  brand: '',
  gender: '',
  color: '',
  purchase_price: '0',
  daily_rent: '0',
  sale_price: '0',
  total_quantity: '1',
  quantity: '1',
  for_rental: true,
  for_sale: true,
  description: '',
  status: 'Available',
}

const STATUS_BADGE_COLORS = {
  Available: 'bg-success-bg text-success-text',
  Reserved: 'bg-warning-bg text-warning-text',
  'Rented Out': 'bg-warning-bg text-warning-text',
  'Out of Stock': 'bg-info-bg text-info-text',
  Discontinued: 'bg-neutral-bg text-text-muted border border-border',
}

export function statusBadgeColorClasses(status) {
  return STATUS_BADGE_COLORS[status] ?? 'bg-neutral-bg text-neutral-text'
}

export function isOutOfStock(status) {
  return String(status || '').toLowerCase() === 'out of stock'
}

export function isDiscontinued(status) {
  return String(status || '').toLowerCase() === 'discontinued'
}

/**
 * Derives accurate live status from product inventory and availability.
 * If all stock is booked/rented, status dynamically resolves to 'Reserved'.
 * If total undamaged stock is 0, resolves to 'Out of Stock'.
 */
export function resolveProductStatus(product) {
  if (!product) return 'Available'

  if (isDiscontinued(product.status)) {
    return 'Discontinued'
  }

  const totalQty = product.total_quantity ?? product.quantity ?? 0
  const damagedQty = product.damaged_quantity || 0
  const inStockQty = Math.max(0, totalQty - damagedQty)
  const availableQty =
    product.available_quantity != null
      ? Math.max(0, Number(product.available_quantity))
      : inStockQty

  if (totalQty <= 0 || inStockQty <= 0) {
    return 'Out of Stock'
  }

  if (isOutOfStock(product.status)) {
    return 'Out of Stock'
  }

  if (availableQty <= 0) {
    return 'Reserved'
  }

  return product.status || 'Available'
}

/**
 * Stock level from on-hand quantity (preferred over status alone).
 * @returns {'out_of_stock' | 'low_stock' | 'in_stock'}
 */
export function getStockLevel(quantity, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const qty = Number(quantity)
  const limit = Number(threshold)
  const safeThreshold =
    Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : DEFAULT_LOW_STOCK_THRESHOLD

  if (!Number.isFinite(qty) || qty <= 0) return 'out_of_stock'
  if (qty <= safeThreshold) return 'low_stock'
  return 'in_stock'
}

export function isLowStock(quantity, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  return getStockLevel(quantity, threshold) === 'low_stock'
}

export function stockQtyClassNames(quantity, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const level = getStockLevel(quantity, threshold)
  if (level === 'out_of_stock') return 'font-bold text-info-text'
  if (level === 'low_stock') return 'font-bold text-warning-text'
  return 'font-semibold text-text'
}

export function availabilityTypeLabel(type) {
  const match = AVAILABILITY_TYPE_OPTIONS.find((opt) => opt.value === type)
  return match?.label || type || '—'
}

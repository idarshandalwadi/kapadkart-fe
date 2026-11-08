/** Headers for Rental-only shops. */
export const PRODUCT_CSV_HEADERS_RENTAL = [
  'product_name',
  'product_code',
  'size',
  'category',
  'brand',
  'gender',
  'color',
  'daily_rent',
  'purchase_price',
  'quantity',
  'description',
]

/** Headers for Sales-only shops. */
export const PRODUCT_CSV_HEADERS_SALES = [
  'product_name',
  'product_code',
  'size',
  'category',
  'brand',
  'gender',
  'color',
  'sale_price',
  'purchase_price',
  'quantity',
  'description',
]

/** Headers for Both (Rental & Sales) shops. */
export const PRODUCT_CSV_HEADERS_BOTH = [
  'product_name',
  'product_code',
  'size',
  'category',
  'brand',
  'gender',
  'color',
  'daily_rent',
  'sale_price',
  'purchase_price',
  'availability_type',
  'quantity',
  'description',
]

/** Columns shared by product export and import CSV files (default full catalog).
 * Images are strictly omitted from CSV files (managed via Web UI).
 */
export const PRODUCT_CSV_EXPORT_HEADERS = PRODUCT_CSV_HEADERS_BOTH

/** Retrieve CSV headers dynamically matching shop business type */
export function getProductCsvHeaders(businessType = 'SALES_AND_RENTAL') {
  const normType = String(businessType || '').toUpperCase()
  if (normType === 'RENTAL') return PRODUCT_CSV_HEADERS_RENTAL
  if (normType === 'SALES') return PRODUCT_CSV_HEADERS_SALES
  return PRODUCT_CSV_HEADERS_BOTH
}

/** Valid availability_type values (must match backend constants/products.js) */
const VALID_AVAILABILITY_TYPES = ['rent', 'sell', 'both']

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

function statusFromQuantity(quantity) {
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty <= 0) return 'Out of Stock'
  return 'Available'
}

export function formatProductForCsv(product) {
  if (!product) return {}

  const availabilityType =
    product.availability_type ||
    (product.for_rental && product.for_sale
      ? 'both'
      : product.for_sale
        ? 'sell'
        : 'rent')

  const quantity = product.total_quantity ?? product.quantity ?? 0

  return {
    product_name: product.product_name ?? '',
    product_code: product.product_code ?? '',
    size: product.size ?? '',
    category: product.category ?? '',
    brand: product.brand ?? '',
    gender: product.gender ?? '',
    color: product.color ?? '',
    daily_rent:
      product.daily_rent != null && product.daily_rent !== ''
        ? String(product.daily_rent)
        : '0',
    sale_price:
      product.sale_price != null && product.sale_price !== ''
        ? String(product.sale_price)
        : '0',
    purchase_price:
      product.purchase_price != null && product.purchase_price !== ''
        ? String(product.purchase_price)
        : '0',
    availability_type: availabilityType,
    quantity: String(quantity),
    description: product.description ?? '',
  }
}

export function productsToCsv(products, businessType = 'SALES_AND_RENTAL') {
  const headers = getProductCsvHeaders(businessType)
  const lines = [
    headers.join(','),
    ...products.map((product) => {
      const formatted = formatProductForCsv(product)
      return headers.map((key) => escapeCsv(formatted[key] ?? '')).join(',')
    }),
  ]
  return lines.join('\n')
}

export function downloadProductsCsv(products, filename, businessType = 'SALES_AND_RENTAL') {
  const csv = productsToCsv(products, businessType)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download =
    filename || `products-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export const SAMPLE_PRODUCTS_RENTAL = [
  {
    product_name: 'Sample Sherwani',
    product_code: 'SH-001',
    size: 'L,XL',
    category: 'Sherwani',
    brand: 'Raymond',
    gender: 'Male',
    color: 'Maroon',
    daily_rent: '1500',
    purchase_price: '8000',
    quantity: '5',
    description: 'Rental-only product — set daily rental rate',
  },
  {
    product_name: 'Sample Lehenga',
    product_code: 'LH-001',
    size: 'M,L',
    category: 'Designer Lehenga',
    brand: 'Sabyasachi',
    gender: 'Female',
    color: 'Red',
    daily_rent: '2000',
    purchase_price: '12000',
    quantity: '3',
    description: 'Bridal wear for rental',
  },
]

export const SAMPLE_PRODUCTS_SALES = [
  {
    product_name: 'Sample Silk Saree',
    product_code: 'SR-001',
    size: 'Free Size',
    category: 'Saree',
    brand: 'Kalamandir',
    gender: 'Female',
    color: 'Royal Blue',
    sale_price: '4500',
    purchase_price: '2800',
    quantity: '8',
    description: 'Pure Kanjivaram silk saree for sale',
  },
  {
    product_name: 'Sample Designer Kurta',
    product_code: 'KT-001',
    size: 'M,L,XL',
    category: 'Kurta',
    brand: 'Manyavar',
    gender: 'Male',
    color: 'Cream',
    sale_price: '2200',
    purchase_price: '1200',
    quantity: '12',
    description: 'Festive cotton silk kurta for sale',
  },
]

export const SAMPLE_PRODUCTS_BOTH = [
  {
    product_name: 'Sample Sherwani',
    product_code: 'SH-001',
    size: 'L,XL',
    category: 'Sherwani',
    brand: 'Raymond',
    gender: 'Male',
    color: 'Maroon',
    daily_rent: '1500',
    sale_price: '0',
    purchase_price: '8000',
    availability_type: 'rent',
    quantity: '5',
    description: 'Rental-only product — leave sale_price as 0',
  },
  {
    product_name: 'Sample Lehenga',
    product_code: 'LH-001',
    size: 'M,L',
    category: 'Designer Lehenga',
    brand: 'Sabyasachi',
    gender: 'Female',
    color: 'Red',
    daily_rent: '2000',
    sale_price: '15000',
    purchase_price: '12000',
    availability_type: 'both',
    quantity: '3',
    description: 'Rent and sell — set availability_type to both',
  },
  {
    product_name: 'Sample Dupatta',
    product_code: 'DP-001',
    size: 'Free Size',
    category: 'Dupatta',
    brand: 'Raymond',
    gender: 'Female',
    color: 'Blue',
    daily_rent: '0',
    sale_price: '500',
    purchase_price: '250',
    availability_type: 'sell',
    quantity: '10',
    description: 'Sale-only product — set availability_type to sell',
  },
]

export const SAMPLE_PRODUCTS = SAMPLE_PRODUCTS_BOTH

export function getSampleProducts(businessType = 'SALES_AND_RENTAL') {
  const normType = String(businessType || '').toUpperCase()
  if (normType === 'RENTAL') return SAMPLE_PRODUCTS_RENTAL
  if (normType === 'SALES') return SAMPLE_PRODUCTS_SALES
  return SAMPLE_PRODUCTS_BOTH
}

const SAMPLE_CODES = new Set(['sh-001', 'lh-001', 'dp-001', 'sr-001', 'kt-001'])

export function isSampleProductRow(row) {
  if (!row) return false
  const code = String(row.product_code || '').trim().toLowerCase()
  const name = String(row.product_name || '').trim().toLowerCase()
  return SAMPLE_CODES.has(code) || (name.startsWith('sample ') && SAMPLE_CODES.has(code))
}

export function containsOnlySampleData(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false
  return rows.every(isSampleProductRow)
}

export function filterOutSampleRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => !isSampleProductRow(row))
}

export function downloadProductsSampleCsv(businessType = 'SALES_AND_RENTAL') {
  const normType = String(businessType || '').toUpperCase()
  const suffix = normType === 'RENTAL' ? 'rental' : normType === 'SALES' ? 'sales' : 'catalog'
  downloadProductsCsv(getSampleProducts(businessType), `products-import-sample-${suffix}.csv`, businessType)
}

export function parseProductsCsv(text, businessType = 'SALES_AND_RENTAL') {
  const normType = String(businessType || '').toUpperCase()
  const lines = String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one product')
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const requiredHeaders = getProductCsvHeaders(businessType)

  for (const key of requiredHeaders) {
    if (!headers.includes(key)) {
      throw new Error(`CSV is missing required column: ${key}`)
    }
  }

  return lines.slice(1).map((line, index) => {
    const csvRow = index + 2 // 1-based, row 1 = header
    const cells = parseCsvLine(line)
    const row = {}

    headers.forEach((header, i) => {
      row[header] = cells[i]?.trim() ?? ''
    })

    if (!row.product_name || !row.product_code) {
      throw new Error(`Row ${csvRow} is missing product_name or product_code`)
    }

    // --- quantity ---
    const quantityRaw = row.quantity
    const quantity = Number(quantityRaw)
    if (
      quantityRaw === '' ||
      quantityRaw == null ||
      Number.isNaN(quantity) ||
      quantity < 0 ||
      !Number.isInteger(quantity)
    ) {
      throw new Error(`Row ${csvRow} has an invalid quantity (must be 0 or a whole number)`)
    }

    // --- daily_rent (optional, defaults to 0) ---
    const dailyRentRaw = row.daily_rent ?? ''
    const dailyRent = dailyRentRaw === '' ? 0 : Number(dailyRentRaw)
    if (Number.isNaN(dailyRent) || dailyRent < 0) {
      throw new Error(`Row ${csvRow} has an invalid daily_rent (must be 0 or a positive number)`)
    }

    // --- sale_price (optional, defaults to 0) ---
    const salePriceRaw = row.sale_price ?? ''
    const salePrice = salePriceRaw === '' ? 0 : Number(salePriceRaw)
    if (Number.isNaN(salePrice) || salePrice < 0) {
      throw new Error(`Row ${csvRow} has an invalid sale_price (must be 0 or a positive number)`)
    }

    // --- purchase_price (optional, defaults to 0) ---
    const purchasePriceRaw = row.purchase_price ?? ''
    const purchasePrice = purchasePriceRaw === '' ? 0 : Number(purchasePriceRaw)
    if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
      throw new Error(`Row ${csvRow} has an invalid purchase_price (must be 0 or a positive number)`)
    }

    // --- availability_type (defaults based on businessType if blank) ---
    const defaultAvailability =
      normType === 'RENTAL' ? 'rent' : normType === 'SALES' ? 'sell' : 'both'
    const availabilityRaw = (row.availability_type ?? '').trim().toLowerCase()
    const availabilityType = availabilityRaw === '' ? defaultAvailability : availabilityRaw
    if (!VALID_AVAILABILITY_TYPES.includes(availabilityType)) {
      throw new Error(
        `Row ${csvRow} has an invalid availability_type "${row.availability_type}" — must be one of: ${VALID_AVAILABILITY_TYPES.join(', ')}`,
      )
    }

    return {
      product_name: row.product_name,
      product_code: row.product_code,
      size: row.size || '',
      category: row.category || '',
      brand: row.brand || '',
      gender: row.gender || '',
      color: row.color || '',
      daily_rent: dailyRent,
      sale_price: salePrice,
      purchase_price: purchasePrice,
      availability_type: availabilityType,
      quantity: String(Math.trunc(quantity)),
      description: row.description || '',
      status: statusFromQuantity(quantity),
      weekly_rent: 0,
      monthly_rent: 0,
      security_deposit: 0,
    }
  })
}

export const PRODUCT_SORT_CYCLE = [
  { sort_by: 'id', sort_order: 'desc', label: 'Newest first' },
  { sort_by: 'quantity', sort_order: 'asc', label: 'Stock low-high' },
  { sort_by: 'quantity', sort_order: 'desc', label: 'Stock high-low' },
  { sort_by: 'product_name', sort_order: 'asc', label: 'Name A-Z' },
  { sort_by: 'product_name', sort_order: 'desc', label: 'Name Z-A' },
  { sort_by: 'daily_rent', sort_order: 'asc', label: 'Rent low-high' },
  { sort_by: 'daily_rent', sort_order: 'desc', label: 'Rent high-low' },
]


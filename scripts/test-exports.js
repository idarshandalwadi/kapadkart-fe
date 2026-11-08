/**
 * KapadKart — Automated Test Suite for All Export & Print Features
 * Run with: node scripts/test-exports.js
 */

import assert from 'node:assert/strict'
import {
  PRODUCT_CSV_EXPORT_HEADERS,
  PRODUCT_CSV_HEADERS_RENTAL,
  PRODUCT_CSV_HEADERS_SALES,
  PRODUCT_CSV_HEADERS_BOTH,
  getProductCsvHeaders,
  getSampleProducts,
  formatProductForCsv,
  productsToCsv,
  parseProductsCsv,
  SAMPLE_PRODUCTS,
  filterOutSampleRows,
  containsOnlySampleData,
  isSampleProductRow,
} from '../src/features/products/utils/productCsv.js'

import {
  escapeCsv,
  formatDateForCsv,
  generatePerformanceCsv,
  generateRentalHistoryCsv,
  generateSalesReportCsv,
} from '../src/shared/utils/exportCsv.js'

import {
  sanitizePart,
  formatBillDate,
  buildBillFileName,
} from '../src/shared/utils/printBill.js'

import {
  parseSelectedProducts,
  formatSelectedProductsNames,
  totalSelectedProductsQuantity,
} from '../src/features/bookings/utils/bookingLineItems.js'

let totalTests = 0
let passedTests = 0

function test(name, fn) {
  totalTests += 1
  try {
    fn()
    passedTests += 1
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
  }
}

function parseCsvToMatrix(csvString) {
  const lines = csvString.replace(/^\uFEFF/, '').trim().split('\n')
  return lines.map((line) => {
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
  })
}

console.log('\n=================================================================')
console.log('  KAPADKART — EXPORT & PRINT FEATURES AUTOMATED TEST SUITE')
console.log('=================================================================\n')

// ============================================================================
// SUITE 1: Product CSV Export & Sample CSV
// ============================================================================
console.log('Suite 1: Product CSV Catalog & Sample Export')

test('PRODUCT_CSV_EXPORT_HEADERS contains exactly 13 standard columns', () => {
  assert.equal(PRODUCT_CSV_EXPORT_HEADERS.length, 13)
  assert.deepEqual(PRODUCT_CSV_EXPORT_HEADERS, [
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
  ])
})

test('getProductCsvHeaders dynamically adapts columns to businessType', () => {
  assert.equal(PRODUCT_CSV_HEADERS_RENTAL.length, 11)
  assert.equal(PRODUCT_CSV_HEADERS_RENTAL.includes('daily_rent'), true)
  assert.equal(PRODUCT_CSV_HEADERS_RENTAL.includes('sale_price'), false)
  assert.equal(PRODUCT_CSV_HEADERS_RENTAL.includes('availability_type'), false)

  assert.equal(PRODUCT_CSV_HEADERS_SALES.length, 11)
  assert.equal(PRODUCT_CSV_HEADERS_SALES.includes('sale_price'), true)
  assert.equal(PRODUCT_CSV_HEADERS_SALES.includes('daily_rent'), false)
  assert.equal(PRODUCT_CSV_HEADERS_SALES.includes('availability_type'), false)

  assert.deepEqual(getProductCsvHeaders('RENTAL'), PRODUCT_CSV_HEADERS_RENTAL)
  assert.deepEqual(getProductCsvHeaders('SALES'), PRODUCT_CSV_HEADERS_SALES)
  assert.deepEqual(getProductCsvHeaders('SALES_AND_RENTAL'), PRODUCT_CSV_HEADERS_BOTH)
})

test('productsToCsv and parseProductsCsv work seamlessly in SALES mode', () => {
  const salesItems = [
    {
      product_name: 'Designer Saree',
      product_code: 'SR-101',
      size: 'Free Size',
      category: 'Saree',
      brand: 'Kalamandir',
      gender: 'Female',
      color: 'Green',
      sale_price: 3500,
      purchase_price: 1800,
      quantity: 5,
      description: 'Banarasi Silk Saree',
    },
  ]

  const csv = productsToCsv(salesItems, 'SALES')
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix[0].length, 11)
  assert.equal(matrix[0].includes('sale_price'), true)
  assert.equal(matrix[0].includes('daily_rent'), false)

  const parsed = parseProductsCsv(csv, 'SALES')
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].product_name, 'Designer Saree')
  assert.equal(parsed[0].sale_price, 3500)
  assert.equal(parsed[0].daily_rent, 0)
  assert.equal(parsed[0].availability_type, 'sell')
})

test('productsToCsv and parseProductsCsv work seamlessly in RENTAL mode', () => {
  const rentalItems = [
    {
      product_name: 'Wedding Sherwani',
      product_code: 'SH-202',
      size: 'XL',
      category: 'Sherwani',
      brand: 'Manyavar',
      gender: 'Male',
      color: 'Gold',
      daily_rent: 1800,
      purchase_price: 9000,
      quantity: 2,
      description: 'Zari embroidered sherwani',
    },
  ]

  const csv = productsToCsv(rentalItems, 'RENTAL')
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix[0].length, 11)
  assert.equal(matrix[0].includes('daily_rent'), true)
  assert.equal(matrix[0].includes('sale_price'), false)

  const parsed = parseProductsCsv(csv, 'RENTAL')
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].product_name, 'Wedding Sherwani')
  assert.equal(parsed[0].daily_rent, 1800)
  assert.equal(parsed[0].sale_price, 0)
  assert.equal(parsed[0].availability_type, 'rent')
})

test('formatProductForCsv formats rental, sale, and dual availability items correctly', () => {
  const rentOnly = formatProductForCsv({
    product_name: 'Royal Sherwani',
    product_code: 'SH-101',
    daily_rent: 1500,
    total_quantity: 4,
    for_rental: true,
    for_sale: false,
  })
  assert.equal(rentOnly.product_name, 'Royal Sherwani')
  assert.equal(rentOnly.product_code, 'SH-101')
  assert.equal(rentOnly.daily_rent, '1500')
  assert.equal(rentOnly.sale_price, '0')
  assert.equal(rentOnly.availability_type, 'rent')
  assert.equal(rentOnly.quantity, '4')

  const bothItem = formatProductForCsv({
    product_name: 'Designer Lehenga',
    product_code: 'LH-202',
    daily_rent: 2500,
    sale_price: 20000,
    purchase_price: 12000,
    quantity: 2,
    for_rental: true,
    for_sale: true,
  })
  assert.equal(bothItem.availability_type, 'both')
  assert.equal(bothItem.sale_price, '20000')
  assert.equal(bothItem.purchase_price, '12000')
  assert.equal(bothItem.quantity, '2')
})

test('productsToCsv generates valid RFC 4180 CSV with escaped quotes and commas', () => {
  const sampleData = [
    {
      product_name: 'Sherwani, "Royal Silk" Edition',
      product_code: 'SH-009',
      size: 'XL',
      category: 'Wedding',
      brand: 'Raymond',
      gender: 'Male',
      color: 'Maroon',
      daily_rent: 1800,
      sale_price: 0,
      purchase_price: 9000,
      availability_type: 'rent',
      quantity: 3,
      description: 'Hand embroidered, heavy zari border',
    },
  ]

  const csv = productsToCsv(sampleData)
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix.length, 2)
  assert.equal(matrix[0].length, 13)
  assert.equal(matrix[1].length, 13)
  assert.equal(matrix[1][0], 'Sherwani, "Royal Silk" Edition')
  assert.equal(matrix[1][1], 'SH-009')
  assert.equal(matrix[1][12], 'Hand embroidered, heavy zari border')
})

test('parseProductsCsv correctly parses CSV data and sample rows', () => {
  const sampleCsv = productsToCsv(SAMPLE_PRODUCTS)
  const parsed = parseProductsCsv(sampleCsv)
  assert.equal(parsed.length, 3)
  assert.equal(parsed[0].product_code, 'SH-001')
  assert.equal(parsed[0].daily_rent, 1500)
  assert.equal(parsed[1].product_code, 'LH-001')
  assert.equal(parsed[1].availability_type, 'both')
  assert.equal(parsed[2].product_code, 'DP-001')
  assert.equal(parsed[2].availability_type, 'sell')
})

test('parseProductsCsv validates required columns and throws descriptive errors', () => {
  assert.throws(
    () => parseProductsCsv('invalid header row without required keys\nval1'),
    /missing required column/i,
  )

  const missingNameCsv =
    PRODUCT_CSV_EXPORT_HEADERS.join(',') + '\n,SH-999,M,Sherwani,Brand,Male,Red,1000,0,0,rent,2,Desc'
  assert.throws(() => parseProductsCsv(missingNameCsv), /missing product_name or product_code/i)

  const invalidQtyCsv =
    PRODUCT_CSV_EXPORT_HEADERS.join(',') + '\nSherwani,SH-999,M,Cat,Brand,M,Red,1000,0,0,rent,-5,Desc'
  assert.throws(() => parseProductsCsv(invalidQtyCsv), /invalid quantity/i)
})

test('Sample product filters work accurately', () => {
  assert.equal(isSampleProductRow({ product_code: 'SH-001' }), true)
  assert.equal(isSampleProductRow({ product_code: 'CUSTOM-01' }), false)
  assert.equal(containsOnlySampleData(SAMPLE_PRODUCTS), true)
  assert.equal(containsOnlySampleData([{ product_code: 'MY-01' }]), false)
  const filtered = filterOutSampleRows([...SAMPLE_PRODUCTS, { product_code: 'REAL-01' }])
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].product_code, 'REAL-01')
})

// ============================================================================
// SUITE 2: Performance & ROI CSV Export
// ============================================================================
console.log('\nSuite 2: Product Performance & ROI CSV Export')

test('generatePerformanceCsv produces correct 13 columns with financial metrics', () => {
  const rows = [
    {
      product_code: 'SH-001',
      product_name: 'Royal Velvet Sherwani',
      total_quantity: 10,
      units_sold: 1,
      total_purchased_quantity: 11,
      damaged_quantity: 0,
      purchase_price: 2500,
      invested_amount: 27500,
      times_rented: 5,
      rental_revenue: 10800,
      sales_revenue: 15000,
      total_revenue: 25800,
      net_profit: 23300,
    },
    {
      product_code: 'LH-002',
      product_name: 'Bridal Lehenga (Red)',
      total_quantity: 5,
      units_sold: 0,
      total_purchased_quantity: 5,
      damaged_quantity: 1,
      purchase_price: 5000,
      invested_amount: 25000,
      times_rented: 3,
      rental_revenue: 9000,
      sales_revenue: 0,
      total_revenue: 9000,
      net_profit: 9000,
    },
  ]

  const csv = generatePerformanceCsv(rows)
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix.length, 3)
  assert.equal(matrix[0].length, 13)
  assert.deepEqual(matrix[0], [
    'Product Code',
    'Product Name',
    'Current Stock',
    'Units Sold',
    'Total Acquired',
    'Damaged Stock',
    'Purchase Price',
    'Invested Amount',
    'Times Rented',
    'Rental Revenue',
    'Sales Revenue',
    'Total Revenue',
    'Net Profit',
  ])

  // Row 1 checks (matches ₹2,500 difference calculation: 25800 - 2500 = 23300)
  assert.equal(matrix[1][0], 'SH-001')
  assert.equal(matrix[1][1], 'Royal Velvet Sherwani')
  assert.equal(matrix[1][2], '10')
  assert.equal(matrix[1][3], '1')
  assert.equal(matrix[1][4], '11')
  assert.equal(matrix[1][6], '2500')
  assert.equal(matrix[1][7], '27500')
  assert.equal(matrix[1][11], '25800')
  assert.equal(matrix[1][12], '23300')
})

test('generatePerformanceCsv handles empty data and fallback values gracefully', () => {
  const emptyCsv = generatePerformanceCsv([])
  const emptyMatrix = parseCsvToMatrix(emptyCsv)
  assert.equal(emptyMatrix.length, 1)
  assert.equal(emptyMatrix[0].length, 13)

  const fallbackRow = generatePerformanceCsv([
    {
      product_code: null,
      product_name: null,
      total_quantity: null,
    },
  ])
  const fallbackMatrix = parseCsvToMatrix(fallbackRow)
  assert.equal(fallbackMatrix.length, 2)
  assert.equal(fallbackMatrix[1][0], '')
  assert.equal(fallbackMatrix[1][2], '0')
})

test('generatePerformanceCsv supports filtered date ranges and accurate calculations', () => {
  const periodicRows = [
    {
      product_code: 'KURTA-01',
      product_name: 'Silk Kurta',
      total_quantity: 8,
      units_sold: 2,
      total_purchased_quantity: 10,
      damaged_quantity: 0,
      purchase_price: 1000,
      invested_amount: 10000,
      times_rented: 4,
      rental_revenue: 4000,
      sales_revenue: 3000,
      total_revenue: 7000,
      net_profit: 5000, // 7000 total revenue - (2 sold * 1000 cost = 2000) = 5000
    },
  ]

  const csv = generatePerformanceCsv(periodicRows)
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix.length, 2)
  assert.equal(matrix[1][0], 'KURTA-01')
  assert.equal(matrix[1][11], '7000')
  assert.equal(matrix[1][12], '5000')
})

// ============================================================================
// SUITE 3: Rental Reports CSV Export
// ============================================================================
console.log('\nSuite 3: Rental Reports CSV Export')

test('generateRentalHistoryCsv formats multi-item bookings, quantities, and dates', () => {
  const rows = [
    {
      bill_no: 'R-2026-001',
      order_date: '2026-09-19T08:30:00.000Z',
      customer_name: 'Rahul Patel',
      village: 'Bardoli, Surat',
      return_date: '2026-09-22',
      product_and_code: JSON.stringify({
        items: [
          { product_name: 'Sherwani Maroon', product_code: 'SH-01', quantity: 2 },
          { product_name: 'Mojdi Pair', product_code: 'MJ-05', quantity: 1 },
        ],
      }),
      paid_amount: 3000,
      due_amount: 500,
      grand_total: 3500,
    },
    {
      bill_no: 'R-2026-002',
      order_date: '2026-09-18',
      customer_name: 'Amit Shah',
      village: 'Navsari',
      return_date: '2026-09-20',
      product_and_code: 'Kurta Set (K-10) x1',
      paid_amount: 1200,
      due_amount: 0,
      grand_total: 1200,
    },
  ]

  const csv = generateRentalHistoryCsv(rows)
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix.length, 3)
  assert.equal(matrix[0].length, 10)
  assert.deepEqual(matrix[0], [
    'Bill No',
    'Order Date',
    'Customer Name',
    'Village',
    'Return Date',
    'Product & Code',
    'Qty',
    'Paid Amount',
    'Due Amount',
    'Grand Total',
  ])

  // Row 1 checks
  assert.equal(matrix[1][0], 'R-2026-001')
  assert.equal(matrix[1][1], '2026-09-19')
  assert.equal(matrix[1][2], 'Rahul Patel')
  assert.equal(matrix[1][3], 'Bardoli, Surat')
  assert.equal(matrix[1][4], '2026-09-22')
  assert.equal(matrix[1][6], '3') // total quantity (2 + 1)
  assert.equal(matrix[1][7], '3000')
  assert.equal(matrix[1][8], '500')
  assert.equal(matrix[1][9], '3500')

  // Row 2 checks
  assert.equal(matrix[2][0], 'R-2026-002')
  assert.equal(matrix[2][1], '2026-09-18')
  assert.equal(matrix[2][6], '1')
})

// ============================================================================
// SUITE 4: Sales Reports CSV Export
// ============================================================================
console.log('\nSuite 4: Direct Sales Reports CSV Export')

test('generateSalesReportCsv produces accurate 10 columns for direct sales', () => {
  const rows = [
    {
      bill_no: 'S-2026-101',
      created_at: '2026-09-19T10:15:00.000Z',
      customer_name: 'Pooja Verma',
      phone_number: '+91 9876543210',
      village_address: 'Kadodara',
      items: [
        { product_name: 'Cotton Kurti', product_code: 'CK-01', quantity: 3 },
      ],
      sale_total: 4500,
      paid_amount: 4500,
      status: 'Paid',
    },
    {
      bill_no: 'S-2026-102',
      created_at: '2026-09-19',
      customer_name: 'Vikas Joshi',
      phone_number: '9825012345',
      village_address: 'Kamrej',
      selected_products: 'Silk Dupatta x2',
      sale_total: 1000,
      paid_amount: 500,
      status: 'Partial',
    },
  ]

  const csv = generateSalesReportCsv(rows)
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix.length, 3)
  assert.equal(matrix[0].length, 12)
  assert.deepEqual(matrix[0], [
    'Bill No',
    'Date',
    'Customer Name',
    'Phone',
    'Village',
    'Products',
    'Qty',
    'Subtotal',
    'Discount',
    'Final Amount',
    'Paid Amount',
    'Status',
  ])

  assert.equal(matrix[1][0], 'S-2026-101')
  assert.equal(matrix[1][1], '2026-09-19')
  assert.equal(matrix[1][2], 'Pooja Verma')
  assert.equal(matrix[1][3], '+91 9876543210')
  assert.equal(matrix[1][6], '3')
  assert.equal(matrix[1][7], '4500')
  assert.equal(matrix[1][8], '0')
  assert.equal(matrix[1][9], '4500')
  assert.equal(matrix[1][10], '4500')
  assert.equal(matrix[1][11], 'Paid')
})

// ============================================================================
// SUITE 5: Bill Filename Sanitization & Print Utilities
// ============================================================================
console.log('\nSuite 5: Bill Filename Sanitization & Print Utilities')

test('sanitizePart removes illegal filesystem characters and trims whitespace', () => {
  assert.equal(sanitizePart('Rahul / Patel : Shop *'), 'Rahul_Patel_Shop')
  assert.equal(sanitizePart('A??B!!C'), 'ABC')
  assert.equal(sanitizePart('   Leading and Trailing   '), 'Leading_and_Trailing')
  assert.equal(sanitizePart('Multiple____Underscores'), 'Multiple_Underscores')
  assert.equal(sanitizePart(null), '')
  assert.equal(sanitizePart(undefined), '')
})

test('formatBillDate produces clean DDMonYYYY string', () => {
  const formatted = formatBillDate(new Date(2026, 8, 19)) // Sept 19, 2026
  assert.equal(formatted, '19Sep2026')
})

test('buildBillFileName formats CustomerName_BillNO_Date correctly', () => {
  const name1 = buildBillFileName({
    customerName: 'Rahul Patel',
    billNo: 'BILL-1001',
    date: new Date(2026, 8, 19),
  })
  assert.equal(name1, 'Rahul_Patel_BILL-1001_19Sep2026')

  const nameFallback = buildBillFileName({})
  assert.match(nameFallback, /^Customer_Bill_\d{2}[A-Z][a-z]{2}\d{4}$/)
})

// ============================================================================
// SUITE 6: RFC 4180 Escaping & Edge Cases
// ============================================================================
console.log('\nSuite 6: RFC 4180 Escaping & Robustness Edge Cases')

test('escapeCsv encloses values in quotes and escapes internal double quotes', () => {
  assert.equal(escapeCsv('Simple Text'), '"Simple Text"')
  assert.equal(escapeCsv('Text with "Quotes"'), '"Text with ""Quotes"""')
  assert.equal(escapeCsv('Text with, Comma'), '"Text with, Comma"')
  assert.equal(escapeCsv(123), '"123"')
  assert.equal(escapeCsv(null), '""')
  assert.equal(escapeCsv(undefined), '""')
})

test('formatDateForCsv correctly extracts YYYY-MM-DD from ISO dates and leaves plain dates unchanged', () => {
  assert.equal(formatDateForCsv('2026-09-19T14:30:00.000Z'), '2026-09-19')
  assert.equal(formatDateForCsv('2026-09-19'), '2026-09-19')
  assert.equal(formatDateForCsv(null), '')
  assert.equal(formatDateForCsv(undefined), '')
})

test('Handles Unicode, Gujarati / Hindi names and large amounts accurately in CSV', () => {
  const unicodeRows = [
    {
      bill_no: 'B-999',
      order_date: '2026-09-19',
      customer_name: 'ભાવેશભાઈ પટેલ (Bhaveshbhai Patel)',
      village: 'સુરત / Surat',
      return_date: '2026-09-25',
      product_and_code: 'કાપડ કુર્તા સેટ (Cloth Kurta Set) × 5',
      paid_amount: 150000.5,
      due_amount: 25000.75,
      grand_total: 175001.25,
    },
  ]

  const csv = generateRentalHistoryCsv(unicodeRows)
  const matrix = parseCsvToMatrix(csv)
  assert.equal(matrix.length, 2)
  assert.equal(matrix[1][2], 'ભાવેશભાઈ પટેલ (Bhaveshbhai Patel)')
  assert.equal(matrix[1][3], 'સુરત / Surat')
  assert.equal(matrix[1][7], '150000.5')
})

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n=================================================================')
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`)
console.log('=================================================================\n')

if (passedTests !== totalTests) {
  process.exit(1)
}

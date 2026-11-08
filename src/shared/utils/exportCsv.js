/**
 * Shared CSV export utilities for KapadKart.
 * Adheres to RFC 4180 with UTF-8 BOM (\uFEFF) for Microsoft Excel and spreadsheet compatibility.
 */
import {
  formatSelectedProductsForDisplay,
  totalSelectedProductsQuantity,
} from '../../features/bookings/utils/bookingLineItems.js'

export function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function formatDateForCsv(val) {
  if (!val) return ''
  const str = String(val)
  return str.includes('T') ? str.slice(0, 10) : str
}

export function downloadCsvFile(csvContent, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function generatePerformanceCsv(rows = []) {
  const headers = [
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
  ]

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.product_code || '',
        row.product_name || '',
        row.total_quantity ?? 0,
        row.units_sold ?? 0,
        row.total_purchased_quantity ?? ((row.total_quantity ?? 0) + (row.units_sold ?? 0)),
        row.damaged_quantity ?? 0,
        row.purchase_price ?? 0,
        row.invested_amount ?? ((row.purchase_price ?? 0) * ((row.total_quantity ?? 0) + (row.units_sold ?? 0))),
        row.times_rented ?? 0,
        row.rental_revenue ?? 0,
        row.sales_revenue ?? 0,
        row.total_revenue ?? 0,
        row.net_profit ?? 0,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  return lines.join('\n')
}

export function generateRentalHistoryCsv(rows = []) {
  const headers = [
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
  ]

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.bill_no || '',
        formatDateForCsv(row.order_date),
        row.customer_name || '',
        row.village || '',
        formatDateForCsv(row.return_date),
        formatSelectedProductsForDisplay(row.product_and_code),
        totalSelectedProductsQuantity(row.product_and_code) ?? '',
        row.paid_amount ?? 0,
        row.due_amount ?? 0,
        row.grand_total ?? 0,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  return lines.join('\n')
}

export function generateSalesReportCsv(rows = []) {
  const headers = [
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
  ]

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.bill_no || '',
        formatDateForCsv(row.created_at || row.sale_date || row.date),
        row.customer_name || '',
        row.phone_number || '',
        row.village_address || '',
        formatSelectedProductsForDisplay(row),
        totalSelectedProductsQuantity(row) ?? '',
        row.subtotal ?? (Number(row.sale_total || 0) + Number(row.discount_amount || 0)),
        row.discount_amount ?? 0,
        row.sale_total ?? 0,
        row.paid_amount ?? 0,
        row.status || '',
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  return lines.join('\n')
}

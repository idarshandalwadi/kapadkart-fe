import { toast } from 'sonner'
import {
  formatSelectedProductsNames,
  totalSelectedProductsQuantity,
} from '@/features/bookings/utils/bookingLineItems'
import { SALES_HISTORY_TABLE_COLUMNS } from '@/features/sales/constants/salesReports'
import { isColumnVisible } from '@/shared/hooks/useColumnVisibility'
import {
  buildBookingWhatsAppMessage,
  openWhatsAppShare,
} from '@/shared/utils/whatsappShare'
import { formatDateDisplay, formatDateTimeTooltip } from '@/shared/utils/dateFormat'
import { displayValue, hasDisplayValue } from '@/shared/utils/displayValue'
import { cn } from '@/shared/utils/cn'

const iconBtnClass =
  'inline-flex items-center justify-center size-8 rounded-lg border border-transparent text-[0.9rem] cursor-pointer transition-[background-color,border-color,color,transform] duration-160 disabled:cursor-not-allowed disabled:opacity-50'

function formatCurrency(value) {
  if (!hasDisplayValue(value) && value !== 0 && value !== '0') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return displayValue(value)
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SortableHeader({ label, column, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === column
  const indicator = isActive ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'

  return (
    <th className="sortable">
      <button
        type="button"
        className={cn('sortable-th', isActive && 'active')}
        onClick={() => onSort(column)}
        aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <span className="sort-indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  )
}

function SalesHistoryTable({
  rows,
  sortBy,
  sortOrder,
  onSort,
  companyName,
  onPrintBill,
  printingId,
  visibleColumns,
}) {
  const headerProps = { sortBy, sortOrder, onSort }
  const show = (key) => isColumnVisible(visibleColumns, key)
  const visibleCount = SALES_HISTORY_TABLE_COLUMNS.filter((column) => show(column.key)).length
  const minWidth = Math.max(640, visibleCount * 108 + 140)

  const headerCell = (key, label, sortKey) => {
    if (!show(key)) return null
    if (sortKey) {
      return <SortableHeader label={label} column={sortKey} {...headerProps} />
    }
    return <th>{label}</th>
  }

  const handleShare = (row) => {
    const result = openWhatsAppShare({
      phone: row.phone_number || row.extra_phone_number,
      message: buildBookingWhatsAppMessage(row, companyName),
    })
    if (!result.ok) toast.error(result.error)
  }

  return (
    <div className="data-table-wrap">
      <table
        className="data-table min-w-[var(--table-min-width)] max-[767px]:!min-w-0"
        style={{ '--table-min-width': `${minWidth}px` }}
      >
        <thead>
          <tr>
            {headerCell('bill_no', 'Bill No', 'bill_no')}
            {headerCell('name', 'Name', 'name')}
            {headerCell('village', 'Village', 'village')}
            {headerCell('order_date', 'Order Date', 'order_date')}
            {headerCell('return_date', 'Return Date', 'return_date')}
            {headerCell('products', 'Product & Code')}
            {headerCell('qty', 'Qty')}
            {headerCell('paid', 'Paid Amount', 'paid_amount')}
            {headerCell('due', 'Due Amount', 'due_amount')}
            {headerCell('total', 'Grand Total', 'grand_total')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {show('bill_no') && (
                <td data-label="Bill No" className="font-bold whitespace-nowrap text-text">
                  {displayValue(row.bill_no)}
                </td>
              )}
              {show('name') && (
                <td data-label="Name" className="min-w-[120px] font-semibold">
                  {displayValue(row.customer_name)}
                </td>
              )}
              {show('village') && (
                <td data-label="Village">{displayValue(row.village)}</td>
              )}
              {show('order_date') && (
                <td
                  data-label="Order Date"
                  className="whitespace-nowrap"
                  title={formatDateTimeTooltip(row.order_date)}
                >
                  {formatDateDisplay(row.order_date)}
                </td>
              )}
              {show('return_date') && (
                <td
                  data-label="Return Date"
                  className="whitespace-nowrap"
                  title={formatDateTimeTooltip(row.return_date)}
                >
                  {formatDateDisplay(row.return_date)}
                </td>
              )}
              {show('products') && (
                <td data-label="Product & Code" className="max-w-[220px] leading-[1.4] whitespace-pre-wrap">
                  {formatSelectedProductsNames(row.product_and_code)}
                </td>
              )}
              {show('qty') && (
                <td data-label="Qty" className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                  {totalSelectedProductsQuantity(row.product_and_code) ?? '—'}
                </td>
              )}
              {show('paid') && (
                <td data-label="Paid Amount">{formatCurrency(row.paid_amount)}</td>
              )}
              {show('due') && (
                <td data-label="Due Amount" className="font-semibold text-warning-text">
                  {formatCurrency(row.due_amount)}
                </td>
              )}
              {show('total') && (
                <td data-label="Grand Total" className="font-bold text-text">
                  {formatCurrency(row.grand_total)}
                </td>
              )}
              <td data-label="Actions">
                <div className="flex flex-wrap items-center gap-[0.35rem]">
                  {onPrintBill && (
                    <button
                      type="button"
                      title="Print Bill"
                      aria-label="Print Bill"
                      className={cn(
                        iconBtnClass,
                        'border-border bg-white text-text hover:bg-surface-muted hover:border-border-strong',
                      )}
                      onClick={() => onPrintBill(row)}
                      disabled={printingId === row.id}
                    >
                      {printingId === row.id ? (
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                      ) : (
                        <i className="fa-solid fa-print" aria-hidden="true" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                    className={cn(
                      iconBtnClass,
                      'border-[#b7e4c7] bg-[#ecfdf3] text-[#15803d] hover:bg-[#dcfce7]',
                    )}
                    onClick={() => handleShare(row)}
                  >
                    <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SalesHistoryTable

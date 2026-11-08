import {
  saleStatusBadgeClasses,
  saleStatusLabel,
  SALE_TABLE_COLUMNS,
} from '@/features/sell/constants/sales'
import SaleActions from '@/features/sell/components/SaleActions'
import { parseSelectedProducts } from '@/features/bookings/utils/bookingLineItems'
import { isColumnVisible } from '@/shared/hooks/useColumnVisibility'
import { displayValue, hasDisplayValue, truncateListingText } from '@/shared/utils/displayValue'
import { cn } from '@/shared/utils/cn'

function formatCurrency(value) {
  if (!hasDisplayValue(value) && value !== 0 && value !== '0') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return displayValue(value)
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!hasDisplayValue(value)) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatSaleProducts(saleOrProducts) {
  const { items, legacyText } = parseSelectedProducts(saleOrProducts)
  if (items.length) {
    return items
      .map((item) => {
        const name = truncateListingText(item.product_name, undefined, 'Product')
        const code = item.product_code ? ` (${item.product_code})` : ''
        return `${name}${code}`
      })
      .join(', ')
  }
  return legacyText || '—'
}

function totalQuantity(saleOrProducts) {
  const { items } = parseSelectedProducts(saleOrProducts)
  if (!items.length) return '—'
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  return total > 0 ? total : '—'
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

function SaleTable({
  sales,
  onCancel,
  onPrintBill,
  onViewSale,
  onViewProduct,
  cancellingId,
  printingId,
  companyName,
  showEdit = true,
  sortBy,
  sortOrder,
  onSort,
  visibleColumns,
}) {
  const sortable = typeof onSort === 'function'
  const headerProps = { sortBy, sortOrder, onSort }
  const show = (key) => isColumnVisible(visibleColumns, key)
  const visibleCount = SALE_TABLE_COLUMNS.filter((column) => show(column.key)).length
  const minWidth = Math.max(640, visibleCount * 108 + 140)

  const headerCell = (key, label, sortKey) => {
    if (!show(key)) return null
    if (sortable && sortKey) {
      return <SortableHeader label={label} column={sortKey} {...headerProps} />
    }
    return <th>{label}</th>
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
            {headerCell('date', 'Date', 'created_at')}
            {headerCell('customer', 'Customer', 'customer_name')}
            {headerCell('phone', 'Phone', 'phone_number')}
            {headerCell('products', 'Products')}
            {headerCell('qty', 'Qty')}
            {headerCell('subtotal', 'Subtotal')}
            {headerCell('discount', 'Discount', 'discount_amount')}
            {headerCell('total', 'Final Amount', 'sale_total')}
            {headerCell('paid', 'Paid Amount', 'paid_amount')}
            {headerCell('status', 'Status', 'status')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr
              key={sale.id}
              className={cn(onViewSale && 'cursor-pointer hover:bg-surface-muted/60 transition-colors')}
              onClick={() => onViewSale?.(sale)}
            >
              {show('bill_no') && (
                <td data-label="Bill No" className="font-bold whitespace-nowrap">
                  {onViewSale ? (
                    <button
                      type="button"
                      className="cursor-pointer border-0 bg-transparent p-0 font-bold text-accent hover:text-accent-hover hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewSale(sale)
                      }}
                      title="View sale details"
                    >
                      {displayValue(sale.bill_no)}
                    </button>
                  ) : (
                    displayValue(sale.bill_no)
                  )}
                </td>
              )}
              {show('date') && (
                <td data-label="Date" className="whitespace-nowrap">
                  {formatDate(sale.created_at)}
                </td>
              )}
              {show('customer') && (
                <td data-label="Customer" className="font-semibold">
                  {displayValue(sale.customer_name)}
                </td>
              )}
              {show('phone') && (
                <td data-label="Phone">{displayValue(sale.phone_number)}</td>
              )}
              {show('products') && (
                <td data-label="Products" className="min-w-0 min-[768px]:max-w-[220px] leading-[1.4]">
                  {(() => {
                    const { items, legacyText } = parseSelectedProducts(sale)
                    if (items.length > 0) {
                      return (
                        <div className="flex flex-col gap-[0.25rem]">
                          {items.map((item, i) => (
                            <button
                              key={item.key || item.id || i}
                              type="button"
                              className="block cursor-pointer border-0 bg-transparent p-0 text-left hover:underline group"
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewProduct?.(item.product_id)
                              }}
                            >
                              <span className="block font-medium text-accent group-hover:text-accent-hover transition-colors">
                                {item.product_name} {item.product_code && `(${item.product_code})`} × {item.quantity}
                              </span>
                            </button>
                          ))}
                        </div>
                      )
                    }
                    return legacyText || '—'
                  })()}
                </td>
              )}
              {show('qty') && (
                <td data-label="Qty" className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                  {totalQuantity(sale)}
                </td>
              )}
              {show('subtotal') && (
                <td data-label="Subtotal" className="whitespace-nowrap font-medium text-text-secondary">
                  {formatCurrency(sale.subtotal || (Number(sale.sale_total || 0) + Number(sale.discount_amount || 0)))}
                </td>
              )}
              {show('discount') && (
                <td data-label="Discount" className="whitespace-nowrap font-medium text-danger-text">
                  {Number(sale.discount_amount) > 0 ? `-${formatCurrency(sale.discount_amount)}` : '₹0.00'}
                </td>
              )}
              {show('total') && (
                <td data-label="Final Amount" className="font-bold whitespace-nowrap">
                  {formatCurrency(sale.sale_total)}
                </td>
              )}
              {show('paid') && (
                <td data-label="Paid Amount" className="whitespace-nowrap font-semibold text-success-text">
                  {formatCurrency(sale.paid_amount)}
                </td>
              )}
              {show('status') && (
                <td data-label="Status">
                  <span
                    className={cn(
                      'inline-block whitespace-nowrap rounded-lg px-[0.6rem] py-[0.3rem] text-[0.72rem] font-bold',
                      saleStatusBadgeClasses(sale.status),
                    )}
                  >
                    {saleStatusLabel(sale.status)}
                  </span>
                </td>
              )}
              <td data-label="Actions" onClick={(e) => e.stopPropagation()}>
                <SaleActions
                  sale={sale}
                  onViewSale={onViewSale}
                  onPrintBill={onPrintBill}
                  onCancel={onCancel}
                  printing={printingId === sale.id}
                  cancelling={cancellingId === sale.id}
                  companyName={companyName}
                  showEdit={showEdit}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SaleTable

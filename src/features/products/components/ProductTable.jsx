import ProductActions from './ProductActions'
import { getProductImageUrl, PRODUCT_PLACEHOLDER_IMAGE } from '@/config/api'
import {
  availabilityTypeLabel,
  getStockLevel,
  isOutOfStock,
  PRODUCT_TABLE_COLUMNS,
  resolveProductStatus,
  statusBadgeColorClasses,
  stockQtyClassNames,
} from '@/features/products/constants/products'
import { isColumnVisible } from '@/shared/hooks/useColumnVisibility'
import { displayValue, hasDisplayValue } from '@/shared/utils/displayValue'
import ListingProductName from '@/shared/components/ListingProductName'
import CopyButton from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'

function formatCurrency(value) {
  if (!hasDisplayValue(value) && value !== 0 && value !== '0') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return displayValue(value)
  return `₹${amount.toLocaleString('en-IN')}`
}

const thClass =
  'sticky top-0 z-[1] border-b border-border bg-[linear-gradient(180deg,#2a2e33,#23272c)] px-[0.85rem] py-[0.9rem] text-left align-middle text-[0.68rem] font-bold whitespace-nowrap text-[#fbbf24] uppercase tracking-[0.05em] first:rounded-tl-[15px] last:rounded-tr-[15px]'

const tdClass =
  'border-b border-border px-[0.85rem] py-[0.9rem] text-left align-middle min-[768px]:group-last:border-b-0 max-[767px]:flex max-[767px]:w-full max-[767px]:min-w-0 max-[767px]:items-center max-[767px]:justify-between max-[767px]:gap-4 max-[767px]:border-surface-muted max-[767px]:px-0 max-[767px]:py-[0.45rem] max-[767px]:text-right max-[767px]:last:border-b-0 max-[767px]:before:content-[attr(data-label)] max-[767px]:before:shrink-0 max-[767px]:before:text-left max-[767px]:before:text-[0.7rem] max-[767px]:before:font-bold max-[767px]:before:text-text-muted max-[767px]:before:uppercase max-[767px]:before:tracking-[0.04em]'

const tdImageClass =
  'border-b border-border px-[0.85rem] py-[0.9rem] text-left align-middle min-[768px]:group-last:border-b-0 max-[767px]:flex max-[767px]:justify-center max-[767px]:border-surface-muted max-[767px]:px-0 max-[767px]:pt-[0.45rem] max-[767px]:pb-[0.85rem] max-[767px]:last:border-b-0'

function ProductTable({
  products,
  onDelete,
  onView,
  onAddStock,
  onRestoreDamaged,
  onViewLogs,
  deletingId,
  lowStockThreshold,
  visibleColumns,
}) {
  const show = (key) => isColumnVisible(visibleColumns, key)
  const visibleCount = PRODUCT_TABLE_COLUMNS.filter((column) => show(column.key)).length
  const minWidth = Math.max(640, visibleCount * 100 + 140)

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-md [-webkit-overflow-scrolling:touch] max-[767px]:overflow-x-visible max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:shadow-none">
      <table
        className="w-full border-separate border-spacing-0 text-[0.875rem] min-w-[var(--table-min-width)] max-[767px]:block max-[767px]:!min-w-0"
        style={{ '--table-min-width': `${minWidth}px` }}
      >
        <thead className="max-[767px]:hidden">
          <tr>
            {show('image') && <th className={thClass}>Image</th>}
            {show('product') && <th className={thClass}>Product</th>}
            {show('code') && <th className={thClass}>Code</th>}
            {show('category') && <th className={thClass}>Category</th>}
            {show('brand') && <th className={thClass}>Brand</th>}
            {show('gender') && <th className={thClass}>Gender</th>}
            {show('color') && <th className={thClass}>Color</th>}
            {show('size') && <th className={thClass}>Size</th>}
            {show('daily') && <th className={thClass}>Daily</th>}
            {show('sale') && <th className={thClass}>Sale</th>}
            {show('qty') && <th className={thClass}>Total / Avail</th>}
            {show('for') && <th className={thClass}>For</th>}
            {show('status') && <th className={thClass}>Status</th>}
            <th className={thClass}>Actions</th>
          </tr>
        </thead>
        <tbody className="max-[767px]:flex max-[767px]:flex-col max-[767px]:gap-[0.85rem]">
          {products.map((product) => {
            const totalQty = product.total_quantity ?? product.quantity ?? 0
            const availableQty = product.available_quantity ?? totalQty
            const damagedQty = product.damaged_quantity || 0
            const stockLevel = getStockLevel(totalQty, lowStockThreshold)
            const outOfStock = stockLevel === 'out_of_stock' || isOutOfStock(product.status)
            const lowStock = stockLevel === 'low_stock'

            return (
              <tr
                key={product.id}
                role="button"
                tabIndex={0}
                onClick={() => onView?.(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView?.(product)
                  }
                }}
                className={cn(
                  'group cursor-pointer transition-colors duration-160 max-[767px]:block max-[767px]:rounded-2xl max-[767px]:border max-[767px]:p-[0.95rem] max-[767px]:shadow-sm',
                  outOfStock
                    ? 'bg-info-bg hover:bg-[#dce3ea] max-[767px]:border-[#c5ced8] max-[767px]:bg-info-bg'
                    : lowStock
                      ? 'bg-warning-bg/40 hover:bg-warning-bg/70 max-[767px]:border-[#f0d19a] max-[767px]:bg-warning-bg/35'
                      : 'hover:bg-[rgba(245,158,11,0.07)] max-[767px]:border-border max-[767px]:bg-surface',
                )}
              >
                {show('image') && (
                  <td data-label="Image" className={tdImageClass}>
                    <img
                      src={getProductImageUrl(product)}
                      alt={displayValue(product.product_name, 'Product')}
                      className="size-14 rounded-[10px] bg-surface-muted object-cover shadow-[0_2px_8px_rgba(26,28,30,0.1)] max-[767px]:size-22"
                      loading="lazy"
                      onError={(e) => {
                        const el = e.currentTarget
                        if (el.dataset.fallback === '1') return
                        el.dataset.fallback = '1'
                        el.src = PRODUCT_PLACEHOLDER_IMAGE
                      }}
                    />
                  </td>
                )}
                {show('product') && (
                  <td
                    data-label="Product"
                    className={cn(
                      tdClass,
                      'font-bold tracking-[-0.01em] text-text max-[767px]:min-w-0 min-[768px]:min-w-[160px]',
                    )}
                  >
                    <ListingProductName
                      name={product.product_name}
                      className="max-[767px]:flex-1"
                    />
                  </td>
                )}
                {show('code') && (
                  <td data-label="Code" className={tdClass}>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{displayValue(product.product_code)}</span>
                      {hasDisplayValue(product.product_code) && (
                        <CopyButton text={product.product_code} />
                      )}
                    </div>
                  </td>
                )}
                {show('category') && (
                  <td data-label="Category" className={tdClass}>
                    {displayValue(product.category)}
                  </td>
                )}
                {show('brand') && (
                  <td data-label="Brand" className={tdClass}>
                    {displayValue(product.brand)}
                  </td>
                )}
                {show('gender') && (
                  <td data-label="Gender" className={tdClass}>
                    {displayValue(product.gender)}
                  </td>
                )}
                {show('color') && (
                  <td data-label="Color" className={tdClass}>
                    {displayValue(product.color)}
                  </td>
                )}
                {show('size') && (
                  <td data-label="Size" className={tdClass}>
                    {displayValue(product.size)}
                  </td>
                )}
                {show('daily') && (
                  <td data-label="Daily" className={tdClass}>
                    {formatCurrency(product.daily_rent)}
                  </td>
                )}
                {show('sale') && (
                  <td data-label="Sale" className={tdClass}>
                    {formatCurrency(product.sale_price)}
                  </td>
                )}
                {show('qty') && (
                  <td
                    data-label="Qty"
                    className={cn(tdClass, stockQtyClassNames(totalQty, lowStockThreshold))}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 font-bold">
                        <span>{totalQty}</span>
                        <span className="text-xs text-slate-400">/</span>
                        <span className="text-emerald-400 font-extrabold">{availableQty} avail</span>
                      </div>
                      {damagedQty > 0 && (
                        <span className="text-[0.7rem] text-rose-400 font-semibold">
                          ({damagedQty} damaged)
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {show('for') && (
                  <td data-label="For" className={tdClass}>
                    {availabilityTypeLabel(product.availability_type)}
                  </td>
                )}
                {show('status') && (
                  <td data-label="Status" className={tdClass}>
                    <span
                      className={cn(
                        'inline-block rounded-lg px-[0.6rem] py-[0.3rem] text-[0.75rem] font-bold',
                        statusBadgeColorClasses(resolveProductStatus(product)),
                      )}
                    >
                      {resolveProductStatus(product)}
                    </span>
                  </td>
                )}
                <td
                  data-label="Actions"
                  className={tdClass}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <ProductActions
                    product={product}
                    onDelete={onDelete}
                    onAddStock={onAddStock}
                    onRestoreDamaged={onRestoreDamaged}
                    onViewLogs={onViewLogs}
                    deleting={deletingId === product.id}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ProductTable

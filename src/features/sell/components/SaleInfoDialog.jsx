import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '@/shared/components/Dialog'
import { parseSelectedProducts } from '@/features/bookings/utils/bookingLineItems'
import { saleStatusBadgeClasses, saleStatusLabel } from '@/features/sell/constants/sales'
import { createSaleShareLink } from '@/features/sell/api/sales'
import { API_BASE_URL, getProductImageUrl } from '@/config/api'
import { useTenant } from '@/shared/tenant/TenantContext'
import { buildSaleWhatsAppMessage, openWhatsAppShare } from '@/shared/utils/whatsappShare'
import { displayValue, hasDisplayValue } from '@/shared/utils/displayValue'
import { cn } from '@/shared/utils/cn'
import { toast } from 'sonner'

function ItemThumbnail({ src, alt = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="size-11 shrink-0 rounded-lg border border-border bg-surface-muted flex items-center justify-center text-text-muted">
        <i className="fa-solid fa-shirt text-[1rem]" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="size-11 shrink-0 rounded-lg object-cover border border-border"
      onError={() => setFailed(true)}
    />
  )
}

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
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SaleInfoDialog({
  sale,
  open,
  onClose,
  onPrintBill,
  onCancel,
  onViewProduct,
  companyName,
  printing = false,
  cancelling = false,
}) {
  const titleId = useId()
  const closeRef = useRef(null)
  const { path, companyName: tenantCompanyName, branding } = useTenant()
  const [sharing, setSharing] = useState(false)

  if (!sale) return null

  const shopName = companyName || tenantCompanyName || 'KapadKart'
  const isCancelled = sale.status === 'cancelled'

  // Extract items (support direct items array and legacy selected_products string)
  const parsed = parseSelectedProducts(sale.selected_products || sale)
  const rawItems =
    Array.isArray(sale.items) && sale.items.length > 0
      ? sale.items.map((it, idx) => ({
          key: it.id || `item-${idx}`,
          product_id: it.product_id || it.productId,
          product_name: it.product?.product_name || it.product_name || `Product #${it.product_id || idx + 1}`,
          product_code: it.product?.product_code || it.product_code || '',
          rawImage: it.product?.image || it.image || it.product_image || it.image_url || null,
          quantity: it.quantity,
          unit_price: Number(it.unit_price) || 0,
          total_amount: Number(it.total_amount) || Number(it.quantity) * (Number(it.unit_price) || 0),
        }))
      : (parsed.items || []).map((it) => ({
          ...it,
          rawImage: it.product?.image || it.image || it.product_image || it.image_url || null,
        }))

  const lineItems = rawItems.map((it) => ({
    ...it,
    image: getProductImageUrl({ image: it.rawImage }),
  }))

  const computedSubtotal = lineItems.reduce(
    (sum, it) => sum + (Number(it.total_amount) || Number(it.quantity) * (Number(it.unit_price) || 0)),
    0,
  )
  const subtotal = Number(sale.subtotal) || (Number(sale.sale_total || 0) + Number(sale.discount_amount || 0)) || computedSubtotal
  const discount = Number(sale.discount_amount || 0)
  const tax = Number(sale.tax_amount || 0)
  const finalAmount = Number(sale.sale_total || 0)
  const paidAmount = Number(sale.paid_amount || 0)

  const handleShare = async () => {
    const shareWindow = window.open('about:blank', '_blank')
    if (!shareWindow) {
      toast.error('Please allow pop-ups to share on WhatsApp.')
      return
    }

    setSharing(true)
    try {
      const { download_path: downloadPath } = await createSaleShareLink(sale.id)
      const apiBase = String(API_BASE_URL || '').replace(/\/$/, '')
      const downloadUrl = new URL(`${apiBase}${downloadPath}`, window.location.origin).href
      openWhatsAppShare({
        phone: sale.phone_number,
        targetWindow: shareWindow,
        message: buildSaleWhatsAppMessage(sale, shopName, {
          downloadUrl,
          contactNumber: branding?.phone_number || '',
        }),
      })
    } catch (err) {
      shareWindow.close()
      toast.error(err.message || 'Could not create the bill download link')
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-[42rem]"
      className="max-h-[min(94vh,46rem)]"
    >
      {/* Compact Dialog Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              className="m-0 truncate font-display text-[1.1rem] sm:text-[1.2rem] font-bold tracking-[-0.02em] text-text"
            >
              Bill #{sale.bill_no}
            </h2>
            <span
              className={cn(
                'inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider',
                saleStatusBadgeClasses(sale.status),
              )}
            >
              {saleStatusLabel(sale.status)}
            </span>
          </div>
          <p className="m-0 text-[0.72rem] text-text-muted">
            Date: {formatDate(sale.created_at)}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-text transition-colors hover:bg-surface-muted"
          aria-label="Close"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      </div>

      {/* Dialog Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-3.5 flex flex-col gap-2.5">
        {/* Customer Micro-Card */}
        <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0 flex flex-col gap-1">
              <span className="text-[0.68rem] font-bold tracking-wider text-text-muted uppercase">
                Customer Details
              </span>
              <div className="font-semibold text-text text-[0.92rem] truncate">
                {displayValue(sale.customer_name)}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-[0.78rem] text-text-secondary">
                {hasDisplayValue(sale.phone_number) && (
                  <a
                    href={`tel:${sale.phone_number}`}
                    className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <i className="fa-solid fa-phone text-[0.66rem]" />
                    {sale.phone_number}
                  </a>
                )}
              </div>
              {sale.village_address && (
                <div className="text-[0.76rem] text-text-muted truncate mt-0.5">
                  <i className="fa-solid fa-location-dot text-[0.66rem] mr-1 text-text-muted" />
                  {sale.village_address}
                </div>
              )}
            </div>

            {sale.notes && (
              <div className="min-w-0 sm:border-l sm:border-border/60 sm:pl-3 flex flex-col justify-start gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                <span className="text-[0.68rem] font-bold tracking-wider text-text-muted uppercase">
                  Notes
                </span>
                <p className="m-0 text-[0.78rem] text-text whitespace-pre-wrap line-clamp-3">
                  {sale.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Products List Card */}
        <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-3">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60">
            <span className="text-[0.7rem] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-bag-shopping text-accent text-[0.75rem]" />
              Sold Products ({lineItems.length})
            </span>
            <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent-text">
              Total Qty: {lineItems.reduce((s, it) => s + (Number(it.quantity) || 1), 0)}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 divide-y divide-border/40 pr-0.5">
            {lineItems.map((item, idx) => (
              <div key={item.key || idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ItemThumbnail src={item.image} alt={item.product_name} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      title={item.product_name}
                      className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-text hover:text-accent hover:underline truncate block w-full text-[0.84rem]"
                      onClick={() => {
                        if (onViewProduct && item.product_id) {
                          onViewProduct(item.product_id)
                        }
                      }}
                    >
                      {item.product_name}
                    </button>
                    <p className="m-0 text-[0.72rem] text-text-muted truncate">
                      {item.product_code ? `Code: ${item.product_code} · ` : ''}
                      Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-[0.88rem] text-text">
                    {formatCurrency(item.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown Card (Zero-Value Compliant) */}
        <div className="rounded-xl border border-[rgba(245,158,11,0.2)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface))] p-2.5 sm:p-3">
          <p className="m-0 mb-2 text-[0.7rem] font-bold tracking-wider text-text-muted uppercase">
            Payment & Billing Summary
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center text-text-secondary">
              <span>Subtotal</span>
              <span className="font-semibold text-text">{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span>Instant Discount</span>
                <span className="font-bold">-{formatCurrency(discount)}</span>
              </div>
            )}

            {tax > 0 && (
              <div className="flex justify-between items-center text-text-secondary">
                <span>Tax</span>
                <span className="font-semibold text-text">+{formatCurrency(tax)}</span>
              </div>
            )}

            <div className="pt-1.5 border-t border-border flex justify-between items-center">
              <span className="text-[0.88rem] font-bold text-text">Final Amount</span>
              <span className="text-[1rem] font-bold text-accent">{formatCurrency(finalAmount)}</span>
            </div>

            {paidAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span>Paid Amount</span>
                <span className="font-bold">{formatCurrency(paidAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Footer Actions */}
      <div className="border-t border-border bg-surface-muted/40 px-3.5 py-2.5 sm:px-4 sm:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 min-h-[2.35rem] rounded-lg border border-[#b7e4c7] bg-[#ecfdf3] px-3.5 py-1.5 text-xs font-semibold text-[#15803d] hover:bg-[#dcfce7] active:scale-[0.98] transition-transform disabled:opacity-50"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-brands fa-whatsapp text-sm" />
            )}
            <span>Share WhatsApp</span>
          </button>

          {onPrintBill && (
            <button
              type="button"
              className="btn-primary inline-flex items-center justify-center gap-1.5 min-h-[2.35rem] px-4 py-1.5 text-xs font-semibold active:scale-[0.98] transition-transform"
              onClick={() => onPrintBill(sale)}
              disabled={printing}
            >
              {printing ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                <i className="fa-solid fa-print text-sm" />
              )}
              <span>Print Bill</span>
            </button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

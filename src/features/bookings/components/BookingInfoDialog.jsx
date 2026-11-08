import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '@/shared/components/Dialog'
import { parseSelectedProducts, formatItemAccessories } from '@/features/bookings/utils/bookingLineItems'
import { getBookingLifecycleState, getBookingAvailableActions } from '@/features/bookings/constants/bookings'
import { createBookingShareLink } from '@/features/bookings/api/bookings'
import { API_BASE_URL, getProductImageUrl } from '@/config/api'
import { useTenant } from '@/shared/tenant/TenantContext'
import { buildBookingWhatsAppMessage, openWhatsAppShare } from '@/shared/utils/whatsappShare'
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

function formatDateTime(value) {
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

export default function BookingInfoDialog({
  booking,
  open,
  onClose,
  onPrintBill,
  onSend,
  onProcessReturn,
  onDelete,
  onViewProduct,
  companyName,
  printing = false,
}) {
  const titleId = useId()
  const closeRef = useRef(null)
  const { path, companyName: tenantCompanyName, branding } = useTenant()
  const [sharing, setSharing] = useState(false)

  if (!booking) return null

  const shopName = companyName || tenantCompanyName || 'KapadKart'
  const lifecycle = getBookingLifecycleState(booking)
  const permissions = getBookingAvailableActions(booking)

  // Extract items
  const parsed = parseSelectedProducts(booking.selected_products || booking)
  const rawItems =
    Array.isArray(booking.items) && booking.items.length > 0
      ? booking.items.map((it, idx) => {
          const duration = Number(it.rental_days && Number(it.rental_days) > 1 ? it.rental_days : (booking.rental_days || 1))
          return {
            key: it.id || `item-${idx}`,
            product_id: it.product_id || it.productId,
            product_name: it.product?.product_name || it.product_name || `Product #${it.product_id || idx + 1}`,
            product_code: it.product?.product_code || it.product_code || '',
            rawImage: it.product?.image || it.image || it.product_image || it.image_url || null,
            quantity: it.quantity || 1,
            unit_rent: Number(it.unit_rent ?? it.unit_price) || 0,
            rental_days: duration,
            total_amount: Number(it.total_amount) || (Number(it.quantity || 1) * Number(it.unit_rent ?? it.unit_price ?? 0) * duration),
            accessories: it.accessories || {
              choyani: it.choyani || null,
              pant: it.pant || null,
              sol: it.sol || null,
              mojdi: it.mojdi || null,
              other_items: it.other_items || it.otherItems || null,
            },
          }
        })
      : (parsed.items || []).map((it) => {
          const days = Number(parsed.rentalDays || booking.rental_days || 1)
          const qty = Number(it.quantity || 1)
          const unitRent = Number(it.unit_price || 0)
          return {
            ...it,
            rawImage: it.product?.image || it.image || it.product_image || it.image_url || null,
            unit_rent: unitRent,
            rental_days: days,
            total_amount: Number(it.total_amount) || (qty * unitRent * days),
          }
        })

  const lineItems = rawItems.map((it) => ({
    ...it,
    image: getProductImageUrl({ image: it.rawImage }),
  }))

  const totalQuantity = lineItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0)

  const itemsSubtotal = lineItems.reduce(
    (sum, it) => sum + (Number(it.total_amount) || 0),
    0,
  ) || Number(booking.subtotal || 0)

  const accessoriesPrice = Math.max(0, Number(booking.accessories_price) || 0)
  const discountAmount = Math.max(0, Number(booking.discount_amount) || 0)
  const taxRate = Number(booking.tax_rate) || 0
  const taxAmount = Math.max(0, Number(booking.tax_amount) || 0)
  const rentalTotal = Number(booking.rental_total) || Math.max(0, itemsSubtotal + accessoriesPrice - discountAmount + taxAmount)
  const paidAmount = Math.max(0, Number(booking.paid_amount) || 0)
  const dueAmount = Math.max(0, Number(booking.due_amount != null ? booking.due_amount : (rentalTotal - paidAmount)))
  const securityDeposit = Math.max(0, Number(booking.security_deposit) || 0)
  const isDepositPaid = Boolean(booking.deposit_paid || booking.depositPaid || Number(booking.deposit_collected) > 0)
  const depositCollected = isDepositPaid ? (Number(booking.deposit_collected) || securityDeposit) : 0
  const depositPending = !isDepositPaid ? securityDeposit : 0

  const handleShare = async () => {
    const shareWindow = window.open('about:blank', '_blank')
    if (!shareWindow) {
      toast.error('Please allow pop-ups to share on WhatsApp.')
      return
    }

    setSharing(true)
    try {
      const { download_path: downloadPath } = await createBookingShareLink(booking.id)
      const apiBase = String(API_BASE_URL || '').replace(/\/$/, '')
      const downloadUrl = new URL(`${apiBase}${downloadPath}`, window.location.origin).href
      openWhatsAppShare({
        phone: booking.phone_number,
        targetWindow: shareWindow,
        message: buildBookingWhatsAppMessage(booking, shopName, {
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

  const getStatusBadge = () => {
    switch (lifecycle) {
      case 'OVERDUE':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25'
      case 'RETURNED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
      case 'ACTIVE':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
      case 'PICKUP_DUE':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25'
      case 'CANCELLED':
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/25'
      default:
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25'
    }
  }

  const getStatusLabel = () => {
    switch (lifecycle) {
      case 'PICKUP_DUE':
        return 'Ready for Pickup'
      case 'ACTIVE':
        return 'Dispatched'
      case 'RESERVED':
        return 'Reserved'
      default:
        return lifecycle
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
              Bill #{booking.bill_no}
            </h2>
            <span
              className={cn(
                'inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider',
                getStatusBadge(),
              )}
            >
              {getStatusLabel()}
            </span>
          </div>
          <p className="m-0 text-[0.72rem] text-text-muted">
            Booked: {formatDateTime(booking.created_at)}
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
        {/* Customer & Rental Schedule Unified Micro-Card */}
        <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left: Customer info */}
            <div className="min-w-0 flex flex-col gap-1">
              <span className="text-[0.68rem] font-bold tracking-wider text-text-muted uppercase">
                Customer Details
              </span>
              <div className="font-semibold text-text text-[0.92rem] truncate">
                {displayValue(booking.customer_name)}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-[0.78rem] text-text-secondary">
                {hasDisplayValue(booking.phone_number) && (
                  <a
                    href={`tel:${booking.phone_number}`}
                    className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <i className="fa-solid fa-phone text-[0.66rem]" />
                    {booking.phone_number}
                  </a>
                )}
                {booking.extra_phone_number && (
                  <span className="text-text-muted">({booking.extra_phone_number})</span>
                )}
              </div>
              {booking.village_address && (
                <div className="text-[0.76rem] text-text-muted truncate mt-0.5">
                  <i className="fa-solid fa-location-dot text-[0.66rem] mr-1 text-text-muted" />
                  {booking.village_address}
                </div>
              )}
              {booking.notes && (
                <div className="text-[0.72rem] text-text-muted mt-1 pt-1 border-t border-border/50 line-clamp-2">
                  <span className="font-medium text-text-secondary">Note:</span> {booking.notes}
                </div>
              )}
            </div>

            {/* Right: Rental Schedule Timeline */}
            <div className="min-w-0 sm:border-l sm:border-border/60 sm:pl-3 flex flex-col justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold tracking-wider text-text-muted uppercase">
                  Rental Schedule
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface border border-border font-bold text-[0.7rem] text-accent">
                  {booking.rental_days || 1} {booking.rental_days === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-truck-ramp-box text-[0.68rem]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[0.68rem] text-text-muted block leading-none">Pickup</span>
                    <span className="font-semibold text-text text-[0.82rem]">
                      {formatDateTime(booking.pickup_date || booking.use_date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-arrow-rotate-left text-[0.68rem]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[0.68rem] text-text-muted block leading-none">Return</span>
                    <span className="font-semibold text-text text-[0.82rem]">
                      {formatDateTime(booking.return_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products List Card */}
        <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-3">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60">
            <span className="text-[0.7rem] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-shirt text-accent text-[0.75rem]" />
              Rented Items ({lineItems.length})
            </span>
            <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent-text">
              Total Qty: {totalQuantity}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 divide-y divide-border/40 pr-0.5">
            {lineItems.map((item, idx) => {
              const accParts = []
              const acc = item.accessories || {}
              if (acc.choyani) accParts.push(`Choyni: ${acc.choyani}`)
              if (acc.pant) accParts.push(`Pant: ${acc.pant}`)
              if (acc.sol) accParts.push(`Sholl: ${acc.sol}`)
              if (acc.mojdi && acc.mojdi !== 'N/A') accParts.push(`Mojdi: ${acc.mojdi}`)
              if (acc.other_items || acc.otherItems) accParts.push(`Other: ${acc.other_items || acc.otherItems}`)

              return (
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
                        Qty: {item.quantity} × {formatCurrency(item.unit_rent)} / day ({item.rental_days || 1}d)
                      </p>
                      {accParts.length > 0 && (
                        <p className="m-0 text-[0.68rem] text-text-secondary truncate mt-0.5">
                          <i className="fa-solid fa-shirt text-[0.62rem] mr-1 text-accent" />
                          {accParts.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-[0.88rem] text-text">
                      {formatCurrency(item.total_amount)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Financial Breakdown Card (Zero-Value Compliant) */}
        <div className="rounded-xl border border-[rgba(245,158,11,0.2)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface))] p-2.5 sm:p-3">
          <p className="m-0 mb-2 text-[0.7rem] font-bold tracking-wider text-text-muted uppercase">
            Payment & Billing Summary
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            {itemsSubtotal > 0 && (
              <div className="flex justify-between items-center text-text-secondary">
                <span>Items Subtotal</span>
                <span className="font-semibold text-text">{formatCurrency(itemsSubtotal)}</span>
              </div>
            )}

            {accessoriesPrice > 0 && (
              <div className="flex justify-between items-center text-text-secondary">
                <span>Accessories Total</span>
                <span className="font-semibold text-text">+{formatCurrency(accessoriesPrice)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span>Instant Discount</span>
                <span className="font-bold">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {taxAmount > 0 && taxRate > 0 && (
              <div className="flex justify-between items-center text-text-secondary">
                <span>Tax ({taxRate}%)</span>
                <span className="font-semibold text-text">+{formatCurrency(taxAmount)}</span>
              </div>
            )}

            <div className="pt-1.5 border-t border-border flex justify-between items-center">
              <span className="text-[0.88rem] font-bold text-text">Final Rental Amount</span>
              <span className="text-[1rem] font-bold text-accent">{formatCurrency(rentalTotal)}</span>
            </div>

            {paidAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span>Advance Rent Paid (Jama)</span>
                <span className="font-bold">-{formatCurrency(paidAmount)}</span>
              </div>
            )}

            {dueAmount > 0 && (
              <div className="flex justify-between items-center text-amber-600">
                <span>Remaining Rent Due (Baki)</span>
                <span className="font-bold">{formatCurrency(dueAmount)}</span>
              </div>
            )}

            {/* Security Deposit breakdown */}
            {depositCollected > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold pt-1 border-t border-border/60">
                <span>Security Deposit Held</span>
                <span>{formatCurrency(depositCollected)}</span>
              </div>
            )}

            {depositPending > 0 && (
              <>
                <div className="flex justify-between items-center text-amber-700 font-semibold pt-1 border-t border-border/60">
                  <span>Security Deposit (Pending)</span>
                  <span>{formatCurrency(depositPending)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-amber-800 bg-amber-500/10 px-2.5 py-1.5 rounded-lg mt-0.5">
                  <span>Total Due at Pickup</span>
                  <span className="text-[0.98rem]">{formatCurrency(dueAmount + depositPending)}</span>
                </div>
              </>
            )}

            {/* Bilingual Deposit Note */}
            {securityDeposit > 0 && (
              <div className="mt-1.5 p-2 rounded-lg bg-surface-muted/60 border border-border text-[0.7rem] flex flex-col gap-0.5">
                {isDepositPaid ? (
                  <>
                    <p className="m-0 font-medium text-slate-800">
                      Security deposit of {formatCurrency(securityDeposit)} is held separately and is not included in this bill.
                    </p>
                    <p className="m-0 text-slate-600">
                      {formatCurrency(securityDeposit)} ની સિક્યોરિટી ડિપોઝિટ અલગથી રાખવામાં આવે છે અને તે આ બિલમાં શામેલ નથી.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="m-0 font-medium text-amber-900">
                      Security deposit of {formatCurrency(securityDeposit)} is pending and must be paid at pickup/handover.
                    </p>
                    <p className="m-0 text-amber-700">
                      {formatCurrency(securityDeposit)} ની સિક્યોરિટી ડિપોઝિટ બાકી છે અને પીકઅપ/ડિલિવરી વખતે ચૂકવવાની રહેશે.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Footer Actions */}
      <div className="border-t border-border bg-surface-muted/40 px-3.5 py-3 sm:px-[1.35rem] sm:py-[0.85rem] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Left actions: Edit Booking */}
          <div className="flex items-center gap-2">
            {permissions.canEdit && (
              <Link
                to={path(`/booking/${booking.id}/edit`)}
                state={{ booking }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-3.5 py-2 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:bg-surface-muted transition-colors"
                onClick={onClose}
              >
                <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                <span>Edit Booking</span>
              </Link>
            )}
          </div>

          {/* Right actions: Dispatch / Return, WhatsApp, Print */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {permissions.canSend && onSend && (
              <button
                type="button"
                className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition-transform"
                onClick={() => onSend(booking)}
              >
                <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                <span>Dispatch</span>
              </button>
            )}

            {permissions.canReturn && onProcessReturn && (
              <button
                type="button"
                className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-transform"
                onClick={() => onProcessReturn(booking)}
              >
                <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true" />
                <span>Return</span>
              </button>
            )}

            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] rounded-lg border border-[#b7e4c7] bg-[#ecfdf3] px-3.5 py-2 text-xs font-semibold text-[#15803d] hover:bg-[#dcfce7] active:scale-[0.98] transition-transform disabled:opacity-50"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
              ) : (
                <i className="fa-brands fa-whatsapp text-sm" aria-hidden="true" />
              )}
              <span>WhatsApp</span>
            </button>

            {onPrintBill && (
              <button
                type="button"
                className="btn-primary inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-4 py-2 text-xs font-semibold active:scale-[0.98] transition-transform"
                onClick={() => onPrintBill(booking)}
                disabled={printing}
              >
                {printing ? (
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                ) : (
                  <i className="fa-solid fa-print text-sm" aria-hidden="true" />
                )}
                <span>Print Bill</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

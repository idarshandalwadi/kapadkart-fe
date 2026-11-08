import React, { useState, useId } from 'react'
import { sendBooking } from '../api/bookings'
import { toast } from 'sonner'
import { formatDateTimeTooltip } from '@/shared/utils/dateFormat'
import { parseSelectedProducts } from '@/features/bookings/utils/bookingLineItems'
import { Dialog } from '@/shared/components/Dialog'
import NumberInput from '@/shared/components/NumberInput'
import { cn } from '@/shared/utils/cn'

export default function SendBookingDialog({ booking, onClose, onSuccess }) {
  const titleId = useId()
  const [submitting, setSubmitting] = useState(false)

  const unpaidRental = Math.max(0, Number(booking?.rental_total || 0) - Number(booking?.paid_amount || 0))
  const uncollectedDeposit = Math.max(0, Number(booking?.security_deposit || 0) - Number(booking?.deposit_collected || 0))

  const [collectPayment, setCollectPayment] = useState(unpaidRental > 0 || uncollectedDeposit > 0)
  // Cashier must explicitly enter collected amount; not pre-filled by default
  const [rentalAmount, setRentalAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')

  if (!booking) return null

  // Extract items being handed over
  const parsed = parseSelectedProducts(booking.selected_products || booking)
  const handoverItems =
    Array.isArray(booking.items) && booking.items.length > 0
      ? booking.items.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          product_name: it.product?.product_name || it.product_name || `Item #${idx + 1}`,
          product_code: it.product?.product_code || it.product_code || '',
          quantity: it.quantity || 1,
          accessories: it.accessories || {
            choyani: it.choyani || null,
            pant: it.pant || null,
            sol: it.sol || null,
            mojdi: it.mojdi || null,
            other_items: it.other_items || it.otherItems || null,
          },
        }))
      : (parsed.items || []).map((it, idx) => ({
          id: it.key || `item-${idx}`,
          product_name: it.product_name || 'Item',
          product_code: it.product_code || '',
          quantity: it.quantity || 1,
          accessories: it.accessories || {},
        }))

  const totalItemQty = handoverItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0)

  const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100
  const parseMoney = (val) => {
    if (val === '' || val === '.' || val == null) return 0
    const n = Number(val)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const rawRentalEntered = parseMoney(rentalAmount)
  const rawDepositEntered = parseMoney(depositAmount)

  const isRentalOverpaid = collectPayment && rawRentalEntered > unpaidRental
  const isDepositOverpaid = collectPayment && rawDepositEntered > uncollectedDeposit

  const rentPayNow = collectPayment ? roundMoney(rawRentalEntered) : 0
  const depPayNow = collectPayment ? roundMoney(rawDepositEntered) : 0
  const totalCashCollecting = roundMoney(rentPayNow + depPayNow)
  const remainingRentDueAfter = roundMoney(Math.max(0, unpaidRental - rentPayNow))

  const fieldClass =
    'w-full rounded-[9px] border border-border bg-white px-3 py-[0.55rem] text-[0.9rem] text-text transition-[border-color,box-shadow] duration-160 focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (collectPayment) {
      if (rawRentalEntered > unpaidRental) {
        toast.error(`Rental payment (₹${rawRentalEntered}) cannot exceed remaining rental due of ₹${unpaidRental}`)
        return
      }
      if (rawDepositEntered > uncollectedDeposit) {
        toast.error(`Deposit payment (₹${rawDepositEntered}) cannot exceed uncollected deposit of ₹${uncollectedDeposit}`)
        return
      }
    }

    try {
      setSubmitting(true)
      const payload = {
        sent_at: new Date().toISOString(),
      }

      if (collectPayment && totalCashCollecting > 0) {
        payload.payment = {
          rental_amount: rentPayNow,
          deposit_amount: depPayNow,
          payment_method: paymentMethod,
          notes: paymentNotes.trim() || undefined,
        }
      }

      await sendBooking(booking.id, payload)
      toast.success(`Booking #${booking.bill_no} dispatched and handover recorded successfully!`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-[34rem]"
      disableBackdropClick={submitting}
      className="max-h-[min(94vh,44rem)]"
    >
      {/* Compact Dialog Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
            <i className="fa-solid fa-truck-ramp-box text-xs" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex items-center gap-2">
            <h3 id={titleId} className="m-0 font-display text-[1.05rem] font-bold leading-snug tracking-[-0.02em] text-text">
              Dispatch & Handover
            </h3>
            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[0.76rem] font-bold text-accent-text">
              #{booking.bill_no}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
          className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer disabled:opacity-50"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 sm:px-4 sm:py-3.5">
          {/* Customer & Schedule Micro Summary (High-Density) */}
          <div className="rounded-xl border border-border bg-surface-muted/60 p-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="min-w-0">
                <span className="block text-[0.68rem] text-text-muted uppercase tracking-wider font-semibold">Customer</span>
                <div className="font-semibold text-text truncate text-[0.88rem] leading-tight mt-0.5">{booking.customer_name || '—'}</div>
                <div className="text-text-secondary mt-0.5 truncate text-[0.78rem]">
                  <a href={`tel:${booking.phone_number}`} className="text-accent hover:underline inline-flex items-center gap-1 font-medium">
                    <i className="fa-solid fa-phone text-[0.66rem]" />
                    {booking.phone_number}
                  </a>
                  {booking.village_address && <span className="text-text-muted ml-1 font-normal">· {booking.village_address}</span>}
                </div>
              </div>
              <div className="sm:text-right border-t sm:border-t-0 pt-1.5 sm:pt-0 border-border/60 min-w-0">
                <span className="block text-[0.68rem] text-text-muted uppercase tracking-wider font-semibold">Rental Timeline</span>
                <div className="font-medium text-text mt-0.5 text-[0.78rem] truncate">
                  Pickup: <span className="text-blue-600 font-semibold">{booking.pickup_date || booking.use_date ? formatDateTimeTooltip(booking.pickup_date || booking.use_date) : '—'}</span>
                </div>
                <div className="text-[0.76rem] text-text-muted mt-0.5 truncate">
                  Return: <span className="text-amber-700 font-medium">{booking.return_date ? formatDateTimeTooltip(booking.return_date) : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items to Handover Card */}
          <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-3 text-xs">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60">
              <span className="text-[0.7rem] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-shirt text-accent text-[0.75rem]" />
                Items to Handover ({handoverItems.length})
              </span>
              <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent-text">
                Total Qty: {totalItemQty}
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 divide-y divide-border/40 pr-0.5">
              {handoverItems.map((item, idx) => {
                const accParts = []
                const acc = item.accessories || {}
                if (acc.choyani) accParts.push(`Choyni: ${acc.choyani}`)
                if (acc.pant) accParts.push(`Pant: ${acc.pant}`)
                if (acc.sol) accParts.push(`Sholl: ${acc.sol}`)
                if (acc.mojdi && acc.mojdi !== 'N/A') accParts.push(`Mojdi: ${acc.mojdi}`)
                if (acc.other_items || acc.otherItems) accParts.push(`Other: ${acc.other_items || acc.otherItems}`)

                return (
                  <div key={item.id || idx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text text-[0.84rem] truncate leading-tight">
                        {item.product_name}
                        {item.product_code && <span className="ml-1 text-[0.74rem] font-normal text-text-muted">({item.product_code})</span>}
                      </div>
                      {accParts.length > 0 && (
                        <div className="text-[0.7rem] text-text-muted truncate mt-0.5">
                          {accParts.join(' · ')}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 font-bold px-2 py-0.5 rounded bg-surface-muted border border-border text-text text-[0.75rem]">
                      Qty: {item.quantity}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payment Collection Section */}
          <div className="rounded-xl border border-border bg-surface-muted/60 p-2.5 sm:p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] font-bold text-text">
                <input
                  type="checkbox"
                  checked={collectPayment}
                  onChange={(e) => setCollectPayment(e.target.checked)}
                  className="size-4 rounded accent-accent"
                />
                Collect Payment at Handover
              </label>
              {collectPayment && (
                <span className="font-mono text-xs font-bold text-success-text px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Total: ₹{totalCashCollecting.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {collectPayment && (
              <div className="space-y-2">
                {unpaidRental <= 0 && uncollectedDeposit <= 0 ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-success-text">
                    <i className="fa-solid fa-circle-check mr-1.5" /> All rental fees and security deposits have already been settled. No payment required at handover.
                  </div>
                ) : (
                  <div className={cn(
                    'grid grid-cols-1 gap-2',
                    unpaidRental > 0 && uncollectedDeposit > 0 && 'min-[480px]:grid-cols-2'
                  )}>
                    {unpaidRental > 0 && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[0.7rem]">
                          <span className="font-semibold text-text-secondary">
                            Rental Amount (₹)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-text-muted', isRentalOverpaid && 'font-semibold text-danger')}>
                              Due: ₹{unpaidRental}
                            </span>
                            {unpaidRental > 0 && rawRentalEntered !== unpaidRental && (
                              <button
                                type="button"
                                onClick={() => setRentalAmount(String(unpaidRental))}
                                className="text-accent hover:underline font-semibold text-[0.68rem] cursor-pointer"
                              >
                                Fill Due
                              </button>
                            )}
                          </div>
                        </div>
                        <NumberInput
                          id="pickup_rental_amount"
                          min="0"
                          value={rentalAmount}
                          onChange={(e) => setRentalAmount(e.target.value)}
                          placeholder="0"
                          className={cn(
                            fieldClass,
                            'font-semibold text-xs py-1.5 h-9',
                            isRentalOverpaid && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]'
                          )}
                        />
                        {isRentalOverpaid && (
                          <p className="mt-0.5 text-[0.68rem] font-medium text-danger">
                            <i className="fa-solid fa-circle-exclamation mr-1" />
                            Cannot exceed due ₹{unpaidRental}
                          </p>
                        )}
                      </div>
                    )}

                    {uncollectedDeposit > 0 && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[0.7rem]">
                          <span className="font-semibold text-text-secondary">
                            Security Deposit (₹)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-text-muted', isDepositOverpaid && 'font-semibold text-danger')}>
                              Target: ₹{uncollectedDeposit}
                            </span>
                            {uncollectedDeposit > 0 && rawDepositEntered !== uncollectedDeposit && (
                              <button
                                type="button"
                                onClick={() => setDepositAmount(String(uncollectedDeposit))}
                                className="text-accent hover:underline font-semibold text-[0.68rem] cursor-pointer"
                              >
                                Fill Full
                              </button>
                            )}
                          </div>
                        </div>
                        <NumberInput
                          id="pickup_deposit_amount"
                          min="0"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0"
                          className={cn(
                            fieldClass,
                            'font-semibold text-xs py-1.5 h-9',
                            isDepositOverpaid && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]'
                          )}
                        />
                        {isDepositOverpaid && (
                          <p className="mt-0.5 text-[0.68rem] font-medium text-danger">
                            <i className="fa-solid fa-circle-exclamation mr-1" />
                            Cannot exceed target ₹{uncollectedDeposit}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(unpaidRental > 0 || uncollectedDeposit > 0) && (
                  <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                    <div>
                      <label htmlFor="pickup_payment_method" className="mb-1 block text-[0.7rem] font-semibold text-text-secondary">
                        Payment Method
                      </label>
                      <select
                        id="pickup_payment_method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-9 rounded-[9px] border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text leading-normal transition-[border-color,box-shadow] duration-160 focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none cursor-pointer"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI / QR</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-semibold text-text-secondary">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. Paid in cash at shop"
                        className="w-full h-9 rounded-[9px] border border-border bg-white px-3 py-1.5 text-xs font-medium text-text placeholder:text-text-muted transition-[border-color,box-shadow] duration-160 focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Remaining summary banner */}
                {(unpaidRental > 0 || uncollectedDeposit > 0) && (
                  <div className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-medium',
                    (isRentalOverpaid || isDepositOverpaid)
                      ? 'border-transparent bg-danger-bg text-danger'
                      : remainingRentDueAfter === 0
                        ? 'border-transparent bg-success-bg text-success-text'
                        : 'border-transparent bg-warning-bg text-warning-text'
                  )}>
                    {isRentalOverpaid || isDepositOverpaid ? (
                      <span><i className="fa-solid fa-triangle-exclamation mr-1" /> Entered payment amounts exceed allowed limits.</span>
                    ) : remainingRentDueAfter === 0 ? (
                      <span><i className="fa-solid fa-circle-check mr-1" /> Rental fully paid. No pending rent at return.</span>
                    ) : (
                      <span><i className="fa-solid fa-circle-info mr-1" /> ₹{remainingRentDueAfter.toFixed(2)} rental balance will remain pending for return time.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary text-xs h-9 px-3.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || isRentalOverpaid || isDepositOverpaid}
            className="btn-primary text-xs h-9 px-4"
          >
            {submitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                Dispatching...
              </>
            ) : (
              <>
                <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" />
                Confirm Handover & Dispatch
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  )
}


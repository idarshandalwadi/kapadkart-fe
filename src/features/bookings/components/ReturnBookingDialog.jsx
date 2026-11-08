import React, { useState, useEffect, useId } from 'react'
import { processBookingReturn } from '../api/bookings'
import { toast } from 'sonner'
import NumberInput from '@/shared/components/NumberInput'
import { Dialog } from '@/shared/components/Dialog'
import { cn } from '@/shared/utils/cn'

export default function ReturnBookingDialog({ booking, onClose, onSuccess }) {
  const titleId = useId()
  const [returnItems, setReturnItems] = useState([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Payment & Settlement State
  const [paymentAmount, setPaymentAmount] = useState('')
  const [settlementDiscount, setSettlementDiscount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [refundMethod, setRefundMethod] = useState('CASH')

  useEffect(() => {
    if (!booking?.items) return

    const now = new Date()
    const returnDate = booking.return_date ? new Date(booking.return_date) : now
    const isLate = returnDate < now
    const lateDaysCalc = isLate
      ? Math.ceil(Math.abs(now.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const initial = booking.items.map((it) => {
      const remaining = Math.max(0, it.quantity - (it.returned_quantity || 0))
      return {
        booking_item_id: it.id,
        product_name: it.product?.product_name || 'Item',
        product_code: it.product?.product_code || '',
        quantity: it.quantity,
        returned_quantity_prev: it.returned_quantity || 0,
        remaining_to_return: remaining,
        returned_quantity: remaining, // default return all remaining
        damage_quantity: 0,
        damage_amount: 0,
        late_days: lateDaysCalc,
        late_penalty: 0,
        other_penalty: 0,
        notes: '',
      }
    })
    setReturnItems(initial)

    // Calculate initial gross due
    const unpaidRent = Math.max(0, Number(booking.rental_total || 0) - Number(booking.paid_amount || 0))
    setPaymentAmount(unpaidRent > 0 ? String(unpaidRent) : '0')
    setSettlementDiscount('0')
  }, [booking])

  if (!booking) return null

  const fieldClass =
    'w-full rounded-[9px] border border-border bg-white px-3 py-[0.55rem] text-[0.9rem] text-text transition-[border-color,box-shadow] duration-160 focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none'

  const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100
  const parseMoney = (value) => {
    if (value === '' || value === '.' || value == null) return 0
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const isIncompleteMoney = (value) => value === '' || String(value).endsWith('.')

  const handleItemChange = (index, field, value) => {
    setReturnItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const allReturnedCheck = returnItems.every((it) => {
    const returning = Number(it.returned_quantity) || 0
    const prev = Number(it.returned_quantity_prev) || 0
    return (returning + prev) >= it.quantity
  })

  const totalNewPenalties = returnItems.reduce((sum, it) => {
    return (
      sum +
      (Number(it.late_penalty) || 0) +
      (Number(it.damage_amount) || 0) +
      (Number(it.other_penalty) || 0)
    )
  }, 0)

  const cumulativePenalties = Number(booking.penalty_total || 0) + totalNewPenalties
  const depositHeld = Math.max(
    0,
    Number(booking.deposit_collected || 0) - Number(booking.deposit_adjusted || 0) - Number(booking.deposit_refunded || 0)
  )

  const eligibleDepositAdjustment = allReturnedCheck
    ? Math.min(depositHeld, Math.max(0, cumulativePenalties - Number(booking.penalty_paid || 0)))
    : 0
  const refundableDeposit = allReturnedCheck
    ? Math.max(0, depositHeld - eligibleDepositAdjustment)
    : 0

  const unpaidRental = Math.max(0, Number(booking.rental_total || 0) - Number(booking.paid_amount || 0))
  const unpaidPenaltiesAfterDeposit = Math.max(
    0,
    cumulativePenalties - Number(booking.penalty_paid || 0) - eligibleDepositAdjustment
  )
  const totalGrossDue = roundMoney(unpaidRental + unpaidPenaltiesAfterDeposit)

  const paidEntered = parseMoney(paymentAmount)
  const paidNow = roundMoney(Math.min(paidEntered, totalGrossDue))
  const maxDiscount = roundMoney(Math.max(0, totalGrossDue - paidNow))
  const discountNow = roundMoney(Math.min(parseMoney(settlementDiscount), maxDiscount))
  const netRemainingDue = roundMoney(Math.max(0, totalGrossDue - paidNow - discountNow))
  const unpaidGap = maxDiscount

  const handlePaymentChange = (value) => {
    if (isIncompleteMoney(value)) {
      setPaymentAmount(value)
      return
    }
    const numeric = parseMoney(value)
    const capped = roundMoney(Math.min(numeric, totalGrossDue))
    setPaymentAmount(numeric > totalGrossDue ? String(capped) : value)
    setSettlementDiscount((prev) => {
      if (isIncompleteMoney(prev)) return prev
      const nextMax = roundMoney(Math.max(0, totalGrossDue - capped))
      const current = parseMoney(prev)
      return current > nextMax ? String(nextMax) : prev
    })
  }

  const handleDiscountChange = (value) => {
    if (isIncompleteMoney(value)) {
      setSettlementDiscount(value)
      return
    }
    const numeric = parseMoney(value)
    const capped = roundMoney(Math.min(numeric, unpaidGap))
    setSettlementDiscount(numeric > unpaidGap ? String(capped) : value)
  }

  const handleWaiveRemaining = () => {
    setSettlementDiscount(String(unpaidGap))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const itemsToProcess = returnItems
      .filter((it) => Number(it.returned_quantity) > 0)
      .map((it) => ({
        booking_item_id: it.booking_item_id,
        returned_quantity: Number(it.returned_quantity),
        damage_quantity: Number(it.damage_quantity) || 0,
        damage_amount: Number(it.damage_amount) || 0,
        late_days: Number(it.late_days) || 0,
        late_penalty: Number(it.late_penalty) || 0,
        other_penalty: Number(it.other_penalty) || 0,
        notes: it.notes || undefined,
      }))

    if (itemsToProcess.length === 0) {
      toast.error('Please specify a return quantity greater than 0 for at least one item')
      return
    }

    for (const item of returnItems) {
      const returning = Number(item.returned_quantity)
      const damaged = Number(item.damage_quantity) || 0
      if (!Number.isInteger(returning) || returning < 0 || returning > item.remaining_to_return) {
        toast.error(`Return quantity for ${item.product_name} must be between 0 and ${item.remaining_to_return}`)
        return
      }
      if (!Number.isInteger(damaged) || damaged < 0 || damaged > returning) {
        toast.error(`Damaged units for ${item.product_name} cannot exceed the quantity being returned`)
        return
      }
      if ((Number(item.damage_amount) || 0) < 0 || (Number(item.late_penalty) || 0) < 0 || (Number(item.other_penalty) || 0) < 0) {
        toast.error(`Penalty amounts for ${item.product_name} cannot be negative`)
        return
      }
    }

    if (paidNow < 0 || discountNow < 0) {
      toast.error('Received amount and settlement discount cannot be negative')
      return
    }
    if (paidNow > totalGrossDue) {
      toast.error('Amount received cannot exceed total payable')
      return
    }

    try {
      setSubmitting(true)
      await processBookingReturn(booking.id, {
        items: itemsToProcess,
        notes: notes.trim() || undefined,
        payment: {
          direct_payment_amount: paidNow,
          discount_amount: discountNow,
          payment_method: paymentMethod,
          refund_payment_method: refundMethod,
        },
      })
      toast.success(`Return for booking #${booking.bill_no} processed and settled successfully!`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to process return')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-3xl"
      disableBackdropClick={submitting}
      className="max-h-[min(94vh,50rem)]"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
            <i className="fa-solid fa-arrow-rotate-left text-xs" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex items-center gap-2">
            <h3 id={titleId} className="m-0 font-display text-[1.05rem] font-bold leading-snug tracking-[-0.02em] text-text">
              Process Return & Settlement
            </h3>
            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[0.76rem] font-bold text-accent-text">
              #{booking.bill_no}
            </span>
            <span className="text-xs text-text-muted truncate hidden sm:inline">
              · {booking.customer_name}
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
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-4 sm:py-3.5">
          {/* Section 1: Item Inspection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h4 className="m-0 min-w-0 text-[0.7rem] font-bold tracking-wider text-text-muted uppercase">
                1. Garment Inspection & Return
              </h4>
              <span className="shrink-0 text-[0.72rem] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent-text">
                {returnItems.length} {returnItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {returnItems.map((item, idx) => (
              <div
                key={item.booking_item_id}
                className="min-w-0 space-y-2 rounded-xl border border-border bg-surface-muted/60 p-2.5 sm:p-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                  <div className="min-w-0">
                    <span className="break-words text-[0.88rem] font-semibold text-text">{item.product_name}</span>
                    {item.product_code && (
                      <span className="ml-1.5 text-[0.72rem] text-text-muted">({item.product_code})</span>
                    )}
                  </div>
                  <div className="shrink-0 text-[0.72rem] text-text-muted">
                    Total: <strong className="text-text">{item.quantity}</strong>
                    {' '}| Returned: <strong className="text-success-text">{item.returned_quantity_prev}</strong>
                    {' '}| Pending: <strong className="text-accent-text">{item.remaining_to_return}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-0.5 min-[520px]:grid-cols-2 md:grid-cols-3">
                  <div className="min-w-0">
                    <label className="mb-0.5 block text-[0.7rem] font-semibold text-text-secondary">
                      Returning Now (Max: {item.remaining_to_return})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={item.remaining_to_return}
                      value={item.returned_quantity}
                      onChange={(e) => handleItemChange(idx, 'returned_quantity', e.target.value)}
                      className={cn(fieldClass, 'font-semibold text-xs py-1 h-8')}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-0.5 block text-[0.7rem] font-semibold text-text-secondary">
                      Damaged Units
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={item.returned_quantity || 0}
                      value={item.damage_quantity}
                      onChange={(e) => handleItemChange(idx, 'damage_quantity', e.target.value)}
                      className={cn(fieldClass, 'font-semibold text-danger-text text-xs py-1 h-8')}
                    />
                  </div>

                  <div className="min-w-0 min-[520px]:col-span-2 md:col-span-1">
                    <label className="mb-0.5 block text-[0.7rem] font-semibold text-text-secondary">
                      Damage Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.damage_amount}
                      onChange={(e) => handleItemChange(idx, 'damage_amount', e.target.value)}
                      className={cn(fieldClass, 'text-xs py-1 h-8')}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 md:grid-cols-3">
                  <div className="min-w-0">
                    <label className="mb-0.5 block text-[0.7rem] font-semibold text-text-secondary">
                      Late Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.late_days}
                      onChange={(e) => handleItemChange(idx, 'late_days', e.target.value)}
                      className={cn(fieldClass, 'text-xs py-1 h-8')}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-0.5 block text-[0.7rem] font-semibold text-text-secondary">
                      Late Fine (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.late_penalty}
                      onChange={(e) => handleItemChange(idx, 'late_penalty', e.target.value)}
                      className={cn(fieldClass, 'text-xs py-1 h-8')}
                      placeholder="0"
                    />
                  </div>

                  <div className="min-w-0 min-[520px]:col-span-2 md:col-span-1">
                    <label className="mb-0.5 block text-[0.7rem] font-semibold text-text-secondary">
                      Other Penalty (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.other_penalty}
                      onChange={(e) => handleItemChange(idx, 'other_penalty', e.target.value)}
                      className={cn(fieldClass, 'text-xs py-1 h-8')}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 2: Security Deposit Settlement */}
          <div className="min-w-0 space-y-2 rounded-xl border border-border bg-surface-muted/60 p-2.5 sm:p-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-1.5">
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-accent-soft text-accent-text">
                <i className="fa-solid fa-shield-halved text-[0.68rem]" />
              </span>
              <h4 className="m-0 text-[0.72rem] font-bold tracking-wider text-text uppercase">
                2. Security Deposit Settlement
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-border bg-white p-2">
                <span className="block text-text-muted text-[0.7rem] mb-0.5">Deposit Held:</span>
                <span className="font-bold text-text text-xs">
                  ₹{depositHeld.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-white p-2">
                <span className="block text-text-muted text-[0.7rem] mb-0.5">Adjusted for Fines:</span>
                <span className={cn('font-bold text-xs', eligibleDepositAdjustment > 0 ? 'text-danger-text' : 'text-text')}>
                  -₹{eligibleDepositAdjustment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-white p-2">
                <span className="block text-text-muted text-[0.7rem] mb-0.5">Refund to Customer:</span>
                <span className="font-bold text-success-text text-xs">
                  ₹{refundableDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {!allReturnedCheck && (
              <p className="m-0 text-[0.72rem] text-accent-text bg-accent-soft p-2 rounded-lg">
                <i className="fa-solid fa-clock mr-1" /> Partial return: Security deposit (₹{depositHeld}) remains held until all garments are returned.
              </p>
            )}

            {allReturnedCheck && refundableDeposit > 0 && (
              <div className="flex items-center gap-2.5 pt-0.5">
                <label htmlFor="return_refund_method" className="text-[0.72rem] font-semibold text-text-secondary shrink-0">
                  Refund Method:
                </label>
                <div className="w-40">
                  <select
                    id="return_refund_method"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className={cn(fieldClass, 'h-8 py-1 text-xs font-semibold bg-white cursor-pointer')}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Cash & Balance Settlement */}
          <div className="min-w-0 space-y-2.5 rounded-xl border border-border bg-surface-muted/60 p-3">
            <div className="flex flex-col gap-1.5 border-b border-border/80 pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-success-bg text-success-text">
                  <i className="fa-solid fa-receipt text-xs" aria-hidden="true" />
                </span>
                <h4 className="m-0 text-[0.72rem] font-bold tracking-[0.04em] text-text uppercase">
                  3. Payment & Final Balance Settlement
                </h4>
              </div>
              <div className="sm:text-right">
                <span className="inline-block text-[0.68rem] text-text-muted mr-1.5">Payable to Settle:</span>
                <span className="font-mono text-xs font-bold text-accent-text">
                  ₹{totalGrossDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[0.7rem] min-[720px]:grid-cols-4">
              <div className="min-w-0 rounded-lg border border-border bg-white p-2">
                <span className="mb-0.5 block text-text-muted">Rental Balance:</span>
                <span className="break-all font-bold text-text">
                  ₹{unpaidRental.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="min-w-0 rounded-lg border border-border bg-white p-2">
                <span className="mb-0.5 block text-text-muted">Remaining Fines:</span>
                <span className={cn('break-all font-bold', unpaidPenaltiesAfterDeposit > 0 ? 'text-danger-text' : 'text-text')}>
                  +₹{unpaidPenaltiesAfterDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="min-w-0 rounded-lg border border-border bg-white p-2">
                <span className="mb-0.5 block text-text-muted">Received Now:</span>
                <span className="break-all font-bold text-success-text">
                  -₹{paidNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="min-w-0 rounded-lg border border-border bg-white p-2">
                <span className="mb-0.5 block text-text-muted">Discount / Waived:</span>
                <span className="break-all font-bold text-accent-text">
                  -₹{discountNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-0.5 min-[520px]:grid-cols-3">
              <div className="min-w-0">
                <label htmlFor="return_payment_amount" className="mb-1 block text-[0.7rem] font-semibold text-text-secondary">
                  Amount Received Now (₹)
                </label>
                <NumberInput
                  id="return_payment_amount"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => handlePaymentChange(e.target.value)}
                  placeholder="0"
                  className={cn(fieldClass, 'h-8 py-1 text-xs font-bold')}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="return_payment_method" className="mb-1 block text-[0.7rem] font-semibold text-text-secondary">
                  Payment Method
                </label>
                <select
                  id="return_payment_method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={cn(fieldClass, 'h-8 py-1 text-xs font-semibold bg-white cursor-pointer')}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                  <label htmlFor="return_discount_amount" className="block text-[0.7rem] font-semibold text-text-secondary">
                    Settlement Waiver (₹)
                  </label>
                  {unpaidGap > 0 && discountNow !== unpaidGap && (
                    <button
                      type="button"
                      onClick={handleWaiveRemaining}
                      className="cursor-pointer text-[0.65rem] font-semibold text-accent underline hover:text-accent-hover"
                    >
                      Waive ₹{unpaidGap} gap
                    </button>
                  )}
                </div>
                <NumberInput
                  id="return_discount_amount"
                  min="0"
                  value={settlementDiscount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="0"
                  className={cn(fieldClass, 'h-8 py-1 text-xs font-bold text-accent-text')}
                />
              </div>
            </div>

            <div className={cn(
              'flex flex-col gap-1.5 rounded-lg border p-2 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between sm:gap-2',
              netRemainingDue === 0
                ? 'border-transparent bg-success-bg text-success-text'
                : 'border-transparent bg-warning-bg text-warning-text',
            )}>
              <div className="flex min-w-0 items-start gap-1.5">
                <i className={cn(
                  'fa-solid mt-0.5 shrink-0 text-xs',
                  netRemainingDue === 0 ? 'fa-circle-check' : 'fa-circle-exclamation',
                )} aria-hidden="true" />
                <span className="min-w-0 break-words text-[0.75rem]">
                  {netRemainingDue === 0
                    ? 'Full Settlement Complete: Final Due is ₹0.00'
                    : `Partial Settlement: Remaining Due of ₹${netRemainingDue.toFixed(2)} will stay pending.`}
                </span>
              </div>
              <span className="shrink-0 text-xs font-bold sm:text-right">
                Due: ₹{netRemainingDue.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold text-text-secondary">
              Overall Return & Settlement Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(fieldClass, 'h-8 py-1 text-xs')}
              placeholder="e.g. Garments received in good condition, settled final balance"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary min-h-[2.35rem] px-3.5 py-1.5 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary min-h-[2.35rem] px-3.5 py-1.5 text-xs font-semibold"
          >
            {submitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                Processing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-double" aria-hidden="true" />
                Complete Return & Settle
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  )
}



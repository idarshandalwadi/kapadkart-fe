import React, { useState, useEffect } from 'react'
import { restoreDamagedStock } from '../api/products'
import { toast } from 'sonner'

export default function RestoreDamagedDialog({ product, onClose, onSuccess }) {
  const damagedCount = product?.damaged_quantity || 0
  const [quantity, setQuantity] = useState(Math.min(1, damagedCount))
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!product) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [product, submitting, onClose])

  if (!product) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const qty = parseInt(quantity, 10)
    if (!qty || qty <= 0 || qty > damagedCount) {
      toast.error(`Please enter a quantity between 1 and ${damagedCount}`)
      return
    }

    try {
      setSubmitting(true)
      await restoreDamagedStock(product.id, {
        quantity: qty,
        reason: reason.trim() || 'Repaired damaged stock',
      })
      toast.success(`Successfully restored ${qty} damaged units to usable stock!`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to restore damaged stock')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-soft-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-damaged-title"
        className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-md animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </span>
            <div>
              <h3 id="restore-damaged-title" className="font-display font-semibold text-lg text-text">Restore Damaged Stock</h3>
              <p className="text-xs text-text-muted">Return repaired items to available inventory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-muted mb-1.5">Selected Product</div>
            <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-text">{product.product_name}</span>
                <span className="font-mono text-xs text-text-secondary bg-surface px-2 py-0.5 rounded border border-border font-medium">
                  {product.product_code}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-4 text-xs">
                <span className="text-text-secondary">
                  Total Stock: <strong className="text-text font-bold ml-1">{product.total_quantity}</strong>
                </span>
                <span className="text-text-secondary">
                  Damaged Units: <strong className="text-warning-text font-bold ml-1">{damagedCount}</strong>
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-secondary mb-1.5">
              Quantity to Restore (Max: {damagedCount}) <span className="text-danger-text">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={damagedCount}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-border rounded-[10px] text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition text-base font-semibold"
              placeholder="e.g. 1"
            />
          </div>

          <div>
            <label className="block text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-secondary mb-1.5">
              Repair Note / Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-border rounded-[10px] text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition text-sm"
              placeholder="e.g. Dry cleaned, stitch repaired"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || damagedCount <= 0}
              className="btn-primary"
            >
              {submitting ? 'Restoring...' : 'Restore to Available'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

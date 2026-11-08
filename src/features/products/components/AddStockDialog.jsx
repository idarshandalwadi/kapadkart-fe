import React, { useState, useEffect } from 'react'
import { addProductStock } from '../api/products'
import { toast } from 'sonner'

export default function AddStockDialog({ product, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1)
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
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid stock quantity')
      return
    }

    try {
      setSubmitting(true)
      await addProductStock(product.id, {
        quantity: qty,
        reason: reason.trim() || 'Manual stock addition',
      })
      toast.success(`Successfully added ${qty} units of stock!`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to add stock')
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
        aria-labelledby="add-stock-title"
        className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-md animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
            <div>
              <h3 id="add-stock-title" className="font-display font-semibold text-lg text-text">Add Stock</h3>
              <p className="text-xs text-text-muted">Increase available inventory</p>
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
                  Current Total: <strong className="text-success-text font-bold ml-1">{product.total_quantity}</strong>
                </span>
                <span className="text-text-secondary">
                  Damaged: <strong className="text-danger-text font-bold ml-1">{product.damaged_quantity || 0}</strong>
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-secondary mb-1.5">
              Quantity to Add <span className="text-danger-text">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-border rounded-[10px] text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition text-base font-semibold"
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label className="block text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-secondary mb-1.5">
              Reason / Source Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-border rounded-[10px] text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition text-sm"
              placeholder="e.g. Purchase from supplier, batch #102"
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
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

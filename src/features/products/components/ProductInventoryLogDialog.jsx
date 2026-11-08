import React, { useEffect, useState } from 'react'
import { fetchProductInventoryLogs } from '../api/products'

export default function ProductInventoryLogDialog({ product, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!product) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [product, onClose])

  useEffect(() => {
    if (!product?.id) return
    let mounted = true
    setLoading(true)
    fetchProductInventoryLogs(product.id, { limit: 50 })
      .then((res) => {
        if (mounted) {
          setLogs(res.data || [])
        }
      })
      .catch((err) => {
        console.error('Failed to load inventory logs:', err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [product?.id])

  if (!product) return null

  const getBadgeClass = (type) => {
    switch (type) {
      case 'INITIAL_STOCK':
      case 'STOCK_ADDED':
      case 'RESTORED':
        return 'bg-success-bg text-success-text'
      case 'SALE':
        return 'bg-info-bg text-info-text'
      case 'DAMAGE':
        return 'bg-danger-bg text-danger-text'
      case 'RENT_RETURN':
        return 'bg-warning-bg text-warning-text'
      default:
        return 'bg-neutral-bg text-neutral-text'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-[rgba(16,24,32,0.52)] p-0 animate-soft-in"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-log-title"
        className="relative z-[1] flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-md animate-fade-up"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <i className="fa-solid fa-clipboard-list text-sm" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id="inventory-log-title" className="m-0 truncate font-display text-[1.18rem] font-semibold tracking-[-0.02em] text-text">
                Stock Movement History
              </h3>
              <p className="m-0 truncate text-xs text-text-muted">
                {product.product_name} ({product.product_code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-10 text-center text-[0.92rem] text-text-secondary">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-[0.92rem] text-text-muted">No inventory activity recorded yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-muted p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${getBadgeClass(log.change_type)}`}>
                        {log.change_type}
                      </span>
                      <span className="text-[0.75rem] text-text-muted">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-[0.9rem] text-text">
                      {log.reason || 'Stock update'}
                      {log.created_by && <span className="ml-2 text-[0.75rem] text-text-muted">by {log.created_by}</span>}
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <div className={`text-base font-bold ${log.quantity > 0 ? 'text-success-text' : log.quantity < 0 ? 'text-danger-text' : 'text-text-secondary'}`}>
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </div>
                    <div className="text-[0.75rem] text-text-muted">
                      {log.previous_quantity} → <strong className="text-text">{log.new_quantity}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-[0.88rem]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

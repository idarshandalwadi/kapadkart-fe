import { useEffect, useId, useRef, useState } from 'react'

const SUSPENSION_REASONS = [
  {
    id: 'outstanding_payment',
    title: 'Outstanding Payment',
    desc: 'Pending or overdue subscription, service fees, or invoices.',
    icon: 'fa-file-invoice-dollar',
  },
  {
    id: 'unusual_activity',
    title: 'Unusual Activity',
    desc: 'Suspicious, abusive, automated, or potentially unauthorized activity.',
    icon: 'fa-triangle-exclamation',
  },
  {
    id: 'account_sharing',
    title: 'Account Sharing',
    desc: 'Suspected unauthorized credential sharing or multi-location abuse.',
    icon: 'fa-users-slash',
  },
  {
    id: 'other',
    title: 'Other Reason',
    desc: 'Provide a custom reason or administrative explanation.',
    icon: 'fa-comment-dots',
  },
]

export default function SuspensionModal({
  open,
  shop,
  loading = false,
  onConfirm,
  onClose,
}) {
  const titleId = useId()
  const [selectedReason, setSelectedReason] = useState('outstanding_payment')
  const [customReason, setCustomReason] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setSelectedReason('outstanding_payment')
      setCustomReason('')
      setError('')
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, loading, onClose])

  useEffect(() => {
    if (selectedReason === 'other' && open) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [selectedReason, open])

  if (!open || !shop) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (selectedReason === 'other' && !customReason.trim()) {
      setError('Please provide a specific reason for suspension.')
      textareaRef.current?.focus()
      return
    }

    const reasonLabel =
      SUSPENSION_REASONS.find((r) => r.id === selectedReason)?.title || 'Administrative Review'

    onConfirm?.({
      reason: reasonLabel,
      customReason: selectedReason === 'other' ? customReason.trim() : '',
    })
  }

  const shopDisplayName = shop.company_name || shop.name || shop.slug
  const ownerEmail = shop.owner?.email || 'N/A'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-[rgba(16,24,32,0.65)] backdrop-blur-xs p-0 transition-opacity"
        aria-label="Close dialog"
        disabled={loading}
        onClick={() => {
          if (!loading) onClose?.()
        }}
      />

      {/* Modal Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-warn/30 bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 bg-slate-50/80 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <i className="fa-solid fa-triangle-exclamation text-lg" aria-hidden="true" />
            </div>
            <div>
              <h2
                id={titleId}
                className="m-0 font-display text-lg font-bold tracking-tight text-slate-900"
              >
                Suspend Shop Account
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Action requires immediate notification to shop owner
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-50 transition-colors"
            disabled={loading}
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          {/* Shop Context Card */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">{shopDisplayName}</span>
                <span className="ml-2 font-mono text-slate-500">({shop.slug})</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-bold text-amber-800">
                Transition to Suspended
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-slate-500">
              <span>
                <i className="fa-solid fa-envelope mr-1 text-slate-400" />
                Owner: <strong className="text-slate-700">{ownerEmail}</strong>
              </span>
              {shop.phone_number && (
                <span>
                  <i className="fa-solid fa-phone mr-1 text-slate-400" />
                  {shop.phone_number}
                </span>
              )}
            </div>
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Suspension Reason
          </p>

          {/* Reason Radio Group */}
          <div className="space-y-2.5">
            {SUSPENSION_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.id
              return (
                <label
                  key={reason.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="suspension_reason"
                    value={reason.id}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedReason(reason.id)
                      setError('')
                    }}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-amber-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <i className={`fa-solid ${reason.icon} text-xs ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-semibold ${isSelected ? 'text-amber-900' : 'text-slate-900'}`}>
                        {reason.title}
                      </span>
                    </div>
                    <p className="mt-0.5 mb-0 text-xs text-slate-500 leading-relaxed">
                      {reason.desc}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Custom Reason Textarea */}
          {selectedReason === 'other' && (
            <div className="mt-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <label
                htmlFor="custom-suspension-reason"
                className="mb-1.5 block text-xs font-semibold text-slate-900"
              >
                Custom Reason Details <span className="text-red-600">*</span>
              </label>
              <textarea
                id="custom-suspension-reason"
                ref={textareaRef}
                rows={3}
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Explain the specific reason for suspending this shop account..."
                className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden ${
                  error ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                }`}
              />
              {error && (
                <p className="mt-1 text-xs font-semibold text-danger-text">
                  <i className="fa-solid fa-circle-exclamation mr-1" />
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Support Notice Footer */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[0.75rem] text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-shield-halved text-amber-600 mt-0.5" />
              <div>
                <span>
                  The shop owner will automatically receive an official suspension notice. Support
                  channels (
                  <strong className="text-slate-900">support@kapadkart.com</strong>,{' '}
                  <strong className="text-slate-900">+91 7227807493</strong>) are included so they
                  may reach out to resolve the issue.
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-transparent bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                  <span>Suspending...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-pause" aria-hidden="true" />
                  <span>Suspend Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

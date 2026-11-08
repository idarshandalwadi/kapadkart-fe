import { useEffect, useId, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, loading, onCancel])

  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm'
      : variant === 'warn'
        ? 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-sm'
        : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-sm'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-[rgba(16,24,32,0.52)] p-0"
        aria-label="Close dialog"
        disabled={loading}
        onClick={() => {
          if (!loading) onCancel?.()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[1] w-full max-w-[26rem] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              variant === 'danger'
                ? 'bg-red-100 text-red-600'
                : variant === 'warn'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-amber-100 text-amber-600'
            }`}
          >
            <i
              className={`fa-solid ${
                variant === 'danger'
                  ? 'fa-triangle-exclamation text-lg text-red-600'
                  : variant === 'warn'
                    ? 'fa-circle-exclamation text-lg text-amber-600'
                    : 'fa-circle-question text-lg text-amber-600'
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="m-0 font-display text-[1.2rem] font-semibold tracking-[-0.02em] text-slate-900"
            >
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 mb-0 text-[0.92rem] leading-relaxed text-slate-600">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-xs"
            disabled={loading}
            onClick={onCancel}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-transparent px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 transition-colors ${confirmClass}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            ) : (
              <i
                className={`fa-solid ${variant === 'danger' ? 'fa-trash' : 'fa-check'}`}
                aria-hidden="true"
              />
            )}
            <span>{loading ? 'Please wait…' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

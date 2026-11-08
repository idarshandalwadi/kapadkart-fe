import { useEffect, useId, useRef } from 'react'
import { cn } from '@/shared/utils/cn'

function ConfirmDialog({
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

  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancelRef.current?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, loading])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 max-[480px]:p-2" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-[rgba(16,24,32,0.52)] p-0 animate-soft-in"
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
        className="relative z-[1] w-full max-w-[26rem] animate-fade-up rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-md"
      >
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl',
              variant === 'danger'
                ? 'bg-danger-bg text-danger-text'
                : 'bg-accent-soft text-accent-text',
            )}
          >
            <i
              className={cn(
                'text-lg fa-solid',
                variant === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question',
              )}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="m-0 font-display text-[1.18rem] font-semibold tracking-[-0.02em] text-text">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 mb-0 text-[0.92rem] leading-relaxed text-text-secondary">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2.5 max-[480px]:flex-col max-[480px]:*:w-full">
          <button
            ref={cancelRef}
            type="button"
            className="btn-secondary text-[0.88rem] max-[480px]:order-2"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              'text-[0.88rem] max-[480px]:order-1',
              variant === 'danger' ? 'btn-danger' : 'btn-primary',
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

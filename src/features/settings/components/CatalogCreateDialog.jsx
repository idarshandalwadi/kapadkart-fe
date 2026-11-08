import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'

function CatalogCreateDialog({
  open,
  label,
  placeholder,
  maxLength = 20,
  onCreate,
  onCancel,
}) {
  const titleId = useId()
  const inputId = useId()
  const inputRef = useRef(null)
  const savingRef = useRef(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return undefined

    setName('')
    setError('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frameId = requestAnimationFrame(() => inputRef.current?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingRef.current) onCancelRef.current?.()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frameId)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(`${label} name is required`)
      inputRef.current?.focus()
      return
    }

    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      await onCreate(trimmed)
    } catch (err) {
      setError(err.message)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 max-[480px]:p-2" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-[rgba(16,24,32,0.52)] p-0 animate-soft-in"
        aria-label="Close dialog"
        disabled={saving}
        onClick={onCancel}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-[26rem] animate-fade-up rounded-2xl border border-border bg-surface shadow-md overflow-hidden"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <i className="fa-solid fa-plus text-sm" aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="m-0 font-display text-[1.15rem] font-semibold tracking-[-0.02em] text-text">
                Add New {label}
              </h2>
              <p className="m-0 text-xs text-text-muted">Create a catalog option</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close"
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={cn('form-field', error && 'has-error')}>
            <label htmlFor={inputId} className="text-[0.78rem] font-bold uppercase tracking-[0.04em] text-text-secondary">
              {label} Name <span className="required">*</span>
            </label>
            <input
              ref={inputRef}
              id={inputId}
              value={name}
              maxLength={maxLength}
              placeholder={placeholder}
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${inputId}-error` : undefined}
              onChange={(event) => {
                setName(event.target.value.slice(0, maxLength))
                if (error) setError('')
              }}
            />
            {error && <p id={`${inputId}-error`} className="field-error">{error}</p>}
          </div>

          <div className="flex flex-wrap justify-end gap-2.5 pt-3 border-t border-border max-[480px]:flex-col max-[480px]:*:w-full">
            <button
              type="button"
              className="btn-secondary text-[0.88rem] max-[480px]:order-2"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-[0.88rem] max-[480px]:order-1"
              disabled={saving}
            >
              {saving ? 'Adding…' : `Add ${label}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CatalogCreateDialog

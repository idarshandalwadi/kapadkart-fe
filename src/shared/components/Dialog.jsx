import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/utils/cn'

export function Dialog({
  open,
  onClose,
  titleId,
  children,
  className,
  maxWidthClass = 'max-w-[52rem]',
  disableBackdropClick = false,
  allowOverflow = false,
}) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const disableBackdropClickRef = useRef(disableBackdropClick)
  disableBackdropClickRef.current = disableBackdropClick

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !disableBackdropClickRef.current) {
        onCloseRef.current?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Focus the dialog container only on initial open if active focus is not already within it
    const frameId = requestAnimationFrame(() => {
      if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
        dialogRef.current.focus()
      }
    })

    return () => {
      cancelAnimationFrame(frameId)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 max-[480px]:p-2" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-[rgba(16,24,32,0.52)] p-0 animate-soft-in"
        aria-label="Close dialog"
        disabled={disableBackdropClick}
        onClick={() => {
          if (!disableBackdropClickRef.current) onCloseRef.current?.()
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-[1] flex max-h-[92vh] w-full min-w-0 flex-col animate-fade-up rounded-2xl border border-border bg-surface shadow-md outline-none',
          allowOverflow ? 'overflow-visible' : 'overflow-hidden',
          maxWidthClass,
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/shared/utils/cn'

function copyWithSelection(value) {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.tabIndex = -1
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '2em'
  textarea.style.height = '2em'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.style.fontSize = '16px'
  document.body.appendChild(textarea)
  textarea.focus({ preventScroll: true })
  textarea.select()
  textarea.setSelectionRange(0, value.length)

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }

  document.body.removeChild(textarea)
  return ok
}

function CopyButton({ 
  text, 
  title = "Copy Code", 
  className, 
  iconClassName = "text-[0.85rem]",
  successMessage = "Code copied to clipboard"
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopy = (event) => {
    event.stopPropagation()
    const value = text == null ? '' : String(text)
    if (!value) return

    const finish = (ok) => {
      if (ok) {
        setCopied(true)
        if (successMessage) toast.success(successMessage)
        return
      }
      toast.error('Could not copy code')
    }

    // Dialogs can leave the document unfocused, which makes the Clipboard API reject.
    window.focus()

    // Run the fallback in this click so it still has the user gesture if the
    // async Clipboard API rejects.
    const legacyOk = copyWithSelection(value)

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(
        () => finish(true),
        () => finish(legacyOk),
      )
      return
    }

    finish(legacyOk)
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-md p-[0.35rem] transition-colors",
        copied 
          ? "text-success-text" 
          : "text-text-muted hover:bg-surface-muted hover:text-accent-text",
        className
      )}
      title={copied ? "Copied!" : title}
      aria-label={copied ? "Copied" : title}
      onClick={handleCopy}
    >
      <i 
        className={cn(copied ? "fa-solid fa-check" : "fa-regular fa-copy", iconClassName)} 
        aria-hidden="true" 
      />
    </button>
  )
}

export default CopyButton

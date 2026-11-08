import { toast } from 'sonner'

/**
 * Notify the user and move focus to the first invalid field.
 * `errors` should be built in visual field order (first key = first on screen).
 */
export function revealFormErrors(
  errors,
  {
    message = 'Please fix the highlighted fields and try again.',
    fieldIds = {},
  } = {},
) {
  const keys = Object.keys(errors || {})
  if (keys.length === 0) return

  toast.error(message)

  const firstKey = keys[0]
  const id = fieldIds[firstKey] || firstKey

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (!el) return

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })

      const focusTarget =
        el instanceof HTMLElement && typeof el.focus === 'function' && isFocusable(el)
          ? el
          : el.querySelector(
              'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )

      focusTarget?.focus?.({ preventScroll: true })
    })
  })
}

function isFocusable(el) {
  if (!(el instanceof HTMLElement)) return false
  if (el.hasAttribute('disabled')) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return true
  return el.tabIndex >= 0
}

/**
 * Application-wide API form error mapper.
 * Distinguishes usage limits, field validation errors, and form-level errors.
 * Preserves entered user input and focuses the first invalid field.
 *
 * @param {Error} err - Error thrown by apiFetch
 * @param {object} callbacks
 * @param {function} [callbacks.setFieldErrors] - State setter for inline field errors
 * @param {function} [callbacks.setFormError] - State setter for form-level banner error
 * @param {function} [callbacks.onUsageLimit] - Handler when usage quota is reached
 * @param {object} [callbacks.fieldIds] - Mapping from error key to DOM element ID
 * @returns {boolean} true if handled by field errors or usage limit modal
 */
export function handleFormApiError(
  err,
  {
    setFieldErrors,
    setFormError,
    onUsageLimit,
    fieldIds = {},
  } = {}
) {
  if (!err) return false

  // 1. Check for Usage Limit reached
  const isUsageLimit =
    ['PRODUCT_LIMIT_REACHED', 'BOOKING_LIMIT_REACHED', 'SALES_LIMIT_REACHED'].includes(err.code) ||
    /limit reached/i.test(err.message || '')

  if (isUsageLimit && typeof onUsageLimit === 'function') {
    onUsageLimit({
      code: err.code,
      message: err.message,
      details: err.details,
      resource: err.details?.resource,
      limit: err.details?.limit,
      current: err.details?.current,
    })
    return true
  }

  // 2. Field-level validation errors from backend
  const fieldErrors = err.fieldErrors
  if (fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
    if (typeof setFieldErrors === 'function') {
      setFieldErrors((prev) => ({ ...(prev || {}), ...fieldErrors }))
    }
    if (typeof setFormError === 'function') {
      setFormError(err.message || 'Please fix the highlighted fields and try again.')
    }
    revealFormErrors(fieldErrors, {
      message: err.message || 'Please fix the highlighted fields and try again.',
      fieldIds,
    })
    return true
  }

  // 3. Fallback form error or toast
  const fallbackMsg = err.message || 'An unexpected error occurred. Please try again.'
  if (typeof setFormError === 'function') {
    setFormError(fallbackMsg)
  } else {
    toast.error(fallbackMsg)
  }
  return false
}


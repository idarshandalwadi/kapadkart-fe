import {
  isZeroLike,
  preventInvalidNumberKeys,
  sanitizeUnsignedDecimal,
} from '@/shared/utils/numberInput'

/**
 * Unsigned number field: no minus, no exponent.
 * Use `integer` for qty/days; otherwise up to `maxDecimals` (default 2) for money.
 */
function NumberInput({
  integer = false,
  maxDecimals = 2,
  onChange,
  onKeyDown,
  onPaste,
  onFocus,
  value,
  min,
  step,
  name,
  id,
  ...props
}) {
  const decimals = integer ? 0 : maxDecimals

  const emitChange = (event, nextValue) => {
    if (!onChange) return
    onChange({
      ...event,
      target: {
        ...event.target,
        id: id ?? event.target.id,
        name: name ?? event.target.name,
        value: nextValue,
      },
      currentTarget: {
        ...event.currentTarget,
        id: id ?? event.currentTarget?.id,
        name: name ?? event.currentTarget?.name,
        value: nextValue,
      },
    })
  }

  const handleKeyDown = (event) => {
    preventInvalidNumberKeys(event, { integer })
    onKeyDown?.(event)
  }

  const handleChange = (event) => {
    if (props.readOnly || props.disabled) return
    const nextValue = sanitizeUnsignedDecimal(event.target.value, { maxDecimals: decimals })
    emitChange(event, nextValue)
  }

  const handlePaste = (event) => {
    onPaste?.(event)
    if (event.defaultPrevented || props.readOnly || props.disabled) return
    event.preventDefault()
    const text = event.clipboardData?.getData('text') ?? ''
    const nextValue = sanitizeUnsignedDecimal(text, { maxDecimals: decimals })
    emitChange(event, nextValue)
  }

  const handleFocus = (event) => {
    if (isZeroLike(value)) {
      event.target.select()
      requestAnimationFrame(() => event.target.select())
    }
    onFocus?.(event)
  }

  return (
    <input
      {...props}
      id={id}
      name={name}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={min}
      step={step ?? (integer ? 1 : 0.01)}
      value={value ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
    />
  )
}

export default NumberInput

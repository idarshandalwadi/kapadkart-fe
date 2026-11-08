import { useCallback, useMemo, useRef, useState } from 'react'
import { fetchProducts } from '@/features/products/api/products'
import SearchableSelect from '@/shared/components/SearchableSelect'
import { truncateListingText } from '@/shared/utils/displayValue'

const DEFAULT_LIMIT = 50

function productOptionLabel(product) {
  const name = truncateListingText(product.product_name, undefined, 'Product')
  return `${name}${product.product_code ? ` (${product.product_code})` : ''}`
}

export function hasDateAvailability(product) {
  return product?.available_quantity != null && product.available_quantity !== ''
}

export function productAvailableQuantity(product) {
  if (hasDateAvailability(product)) {
    const available = Number(product.available_quantity)
    if (Number.isFinite(available)) return Math.max(0, available)
  }
  const qty = Number(product?.available_for_sale ?? product?.total_quantity ?? product?.quantity)
  return Number.isFinite(qty) ? Math.max(0, qty) : 0
}

export function isProductUnavailable(product) {
  const status = String(product?.status || '')
  if (status.toLowerCase() === 'discontinued') return true

  if (hasDateAvailability(product)) {
    return productAvailableQuantity(product) <= 0
  }
  const qty = Number(product?.available_for_sale ?? product?.total_quantity ?? product?.quantity)
  if (!Number.isFinite(qty) || qty <= 0) return true
  if (status === 'Out of Stock' || status === 'Reserved') return true
  return false
}

export function productUnavailableReason(product) {
  const status = String(product?.status || '')
  if (status.toLowerCase() === 'discontinued') return 'Discontinued'

  if (hasDateAvailability(product)) {
    return productAvailableQuantity(product) <= 0 ? 'Unavailable for these dates' : ''
  }
  const qty = Number(product?.available_for_sale ?? product?.total_quantity ?? product?.quantity)
  if (status === 'Reserved') return 'Rented'
  if (!Number.isFinite(qty) || qty <= 0 || status === 'Out of Stock') return 'Sold out'
  return 'Unavailable'
}

function toOption(product) {
  const unavailable = isProductUnavailable(product)
  const code = product.product_code || ''
  const reason = unavailable ? productUnavailableReason(product) : ''
  const available = productAvailableQuantity(product)
  const stockHint = !unavailable
    ? hasDateAvailability(product)
      ? `Available ${available}`
      : `Stock ${available}`
    : ''

  return {
    value: String(product.id),
    label: truncateListingText(product.product_name, undefined, 'Product'),
    hint: unavailable
      ? [code, reason].filter(Boolean).join(' · ')
      : [code, stockHint].filter(Boolean).join(' · '),
    disabled: unavailable,
    product,
  }
}

/**
 * Server-backed product picker built on SearchableSelect.
 * Unavailable products stay visible but cannot be selected.
 */
function ProductSearchSelect({
  id,
  name = 'product_id',
  value = '',
  onChange,
  status,
  availabilityType,
  inStock = false,
  useDate,
  pickupDate,
  returnDate,
  excludeBookingId,
  limit = DEFAULT_LIMIT,
  placeholder = 'Search by name or code…',
  emptyMessage = 'No products found',
  disabled = false,
  className = '',
  searchDelay = 300,
  'aria-invalid': ariaInvalid,
}) {
  const [results, setResults] = useState([])
  const [cache, setCache] = useState({})
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const requestId = useRef(0)
  const effectiveUseDate = useDate || pickupDate
  const hasRentalWindow = Boolean(effectiveUseDate && returnDate)

  const remember = useCallback((list) => {
    setCache((prev) => {
      const next = { ...prev }
      for (const product of list) {
        next[String(product.id)] = product
      }
      return next
    })
  }, [])

  const search = useCallback(
    async (term) => {
      const reqId = ++requestId.current
      setLoading(true)

      try {
        const json = await fetchProducts({
          page: 1,
          limit,
          status: status || undefined,
          availability_type: availabilityType || undefined,
          in_stock: hasRentalWindow ? undefined : inStock || undefined,
          search: term || undefined,
          sort_by: 'product_name',
          sort_order: 'asc',
          use_date: hasRentalWindow ? effectiveUseDate : undefined,
          return_date: hasRentalWindow ? returnDate : undefined,
          exclude_booking_id: hasRentalWindow ? excludeBookingId : undefined,
        })

        if (reqId !== requestId.current) return

        const data = json.data || []
        // Keep selectable products first, unavailable after.
        data.sort((a, b) => Number(isProductUnavailable(a)) - Number(isProductUnavailable(b)))
        setResults(data)
        setSearchError('')
        remember(data)
      } catch (err) {
        if (reqId !== requestId.current) return
        setResults([])
        setSearchError(err?.message || 'Failed to load products')
      } finally {
        if (reqId === requestId.current) setLoading(false)
      }
    },
    [
      availabilityType,
      effectiveUseDate,
      excludeBookingId,
      hasRentalWindow,
      inStock,
      limit,
      remember,
      returnDate,
      status,
    ],
  )

  const options = useMemo(() => {
    const next = results.map(toOption)

    if (value && !next.some((opt) => opt.value === String(value))) {
      const selected = cache[String(value)]
      if (selected) next.unshift(toOption(selected))
    }

    return next
  }, [results, value, cache])

  const handleChange = (event) => {
    const nextId = event.target.value
    if (!nextId) {
      onChange?.({
        target: { name, value: '' },
        product: null,
      })
      return
    }

    const product =
      event.option?.product ||
      cache[String(nextId)] ||
      results.find((item) => String(item.id) === String(nextId)) ||
      null

    if (product && isProductUnavailable(product)) {
      return
    }

    if (product) remember([product])

    onChange?.({
      target: {
        name,
        value: nextId,
      },
      product,
    })
  }

  return (
    <SearchableSelect
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      emptyMessage={searchError || emptyMessage}
      disabled={disabled}
      className={className}
      loading={loading}
      onSearch={search}
      searchDelay={searchDelay}
      aria-invalid={ariaInvalid}
    />
  )
}

export default ProductSearchSelect
export { productOptionLabel }

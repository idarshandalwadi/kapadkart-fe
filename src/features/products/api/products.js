import { apiFetch } from '@/shared/api/http'

export async function fetchProducts(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.status) searchParams.set('status', params.status)
  if (params.category) searchParams.set('category', params.category)
  if (params.brand) searchParams.set('brand', params.brand)
  if (params.gender) searchParams.set('gender', params.gender)
  if (params.availability_type) searchParams.set('availability_type', params.availability_type)
  if (params.in_stock) searchParams.set('in_stock', String(params.in_stock))
  if (params.stock) searchParams.set('stock', params.stock)
  if (params.low_stock_threshold) {
    searchParams.set('low_stock_threshold', String(params.low_stock_threshold))
  }
  if (params.search) searchParams.set('search', params.search)
  if (params.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)
  if (params.include_image === false) searchParams.set('include_image', 'false')
  const startDate = params.use_date || params.pickup_date || params.useDate || params.pickupDate
  const returnDate = params.return_date || params.returnDate
  if (startDate) searchParams.set('use_date', startDate)
  if (returnDate) searchParams.set('return_date', returnDate)
  const excludeId = params.exclude_booking_id || params.excludeBookingId
  if (excludeId) {
    searchParams.set('exclude_booking_id', String(excludeId))
  }

  return apiFetch(`/api/products?${searchParams}`)
}

export async function fetchProductById(id, params = {}) {
  const searchParams = new URLSearchParams()
  const startDate = params.use_date || params.pickup_date || params.useDate || params.pickupDate
  const returnDate = params.return_date || params.returnDate
  if (startDate) searchParams.set('use_date', startDate)
  if (returnDate) searchParams.set('return_date', returnDate)
  const excludeId = params.exclude_booking_id || params.excludeBookingId
  if (excludeId) {
    searchParams.set('exclude_booking_id', String(excludeId))
  }
  if (params.availability_type) {
    searchParams.set('availability_type', params.availability_type)
  }
  const query = searchParams.toString()
  const json = await apiFetch(`/api/products/${id}${query ? `?${query}` : ''}`)
  return json.data
}

export async function createProduct(data) {
  return apiFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProduct(id, data) {
  return apiFetch(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteProduct(id) {
  return apiFetch(`/api/products/${id}`, {
    method: 'DELETE',
  })
}

export async function addProductStock(id, data) {
  return apiFetch(`/api/products/${id}/add-stock`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function restoreDamagedStock(id, data) {
  return apiFetch(`/api/products/${id}/restore-damaged`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchProductInventoryLogs(id, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  return apiFetch(`/api/products/${id}/inventory-logs?${searchParams}`)
}

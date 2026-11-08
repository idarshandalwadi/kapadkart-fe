import { apiFetch } from '@/shared/api/http'

export async function fetchBookings(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.tab) searchParams.set('tab', params.tab)
  if (params.status) searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.bill_no) searchParams.set('bill_no', params.bill_no)
  if (params.phone_number) searchParams.set('phone_number', params.phone_number)
  if (params.customer_name) searchParams.set('customer_name', params.customer_name)

  return apiFetch(`/api/bookings?${searchParams}`)
}

export async function fetchBookingById(id) {
  const json = await apiFetch(`/api/bookings/${id}`)
  return json.data
}

export async function fetchNextBillNo() {
  return apiFetch('/api/bookings/next-bill-no')
}

export async function createBookingShareLink(id) {
  const json = await apiFetch(`/api/bookings/${id}/share-link`, {
    method: 'POST',
  })
  return json.data
}

export async function createBooking(data) {
  return apiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBooking(id, data) {
  return apiFetch(`/api/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBooking(id) {
  return apiFetch(`/api/bookings/${id}`, {
    method: 'DELETE',
  })
}

export async function sendBooking(id, data = {}) {
  return apiFetch(`/api/bookings/${id}/send`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function processBookingReturn(id, data) {
  return apiFetch(`/api/bookings/${id}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchReturnsSchedule(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.tab) searchParams.set('tab', params.tab)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  return apiFetch(`/api/bookings/returns-schedule?${searchParams}`)
}

export async function fetchRentalAvailability(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.size) searchParams.set('size', params.size)
  if (params.category) searchParams.set('category', params.category)
  if (params.pickup_date) searchParams.set('pickup_date', params.pickup_date)
  if (params.return_date) searchParams.set('return_date', params.return_date)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  return apiFetch(`/api/bookings/availability?${searchParams}`)
}

export async function fetchRentalCalendar(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.product_id) searchParams.set('product_id', params.product_id)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  return apiFetch(`/api/bookings/calendar?${searchParams}`)
}

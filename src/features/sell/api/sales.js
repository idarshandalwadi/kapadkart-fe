import { apiFetch } from '@/shared/api/http'

export async function fetchSales(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.status) searchParams.set('status', params.status)
  if (params.bill_no) searchParams.set('bill_no', params.bill_no)
  if (params.phone_number) searchParams.set('phone_number', params.phone_number)
  if (params.customer_name) searchParams.set('customer_name', params.customer_name)
  if (params.search) searchParams.set('search', params.search)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)

  return apiFetch(`/api/sales?${searchParams}`)
}

export async function fetchSalesReportSummary(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.chart_days) searchParams.set('chart_days', String(params.chart_days))
  return apiFetch(`/api/sales/report-summary?${searchParams}`)
}

export async function fetchSaleById(id) {
  const json = await apiFetch(`/api/sales/${id}`)
  return json.data
}

export async function fetchNextSaleBillNo() {
  return apiFetch('/api/sales/next-bill-no')
}

export async function createSaleShareLink(id) {
  const json = await apiFetch(`/api/sales/${id}/share-link`, {
    method: 'POST',
  })
  return json.data
}

export async function createSale(data) {
  return apiFetch('/api/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSale(id, data) {
  return apiFetch(`/api/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteSale(id) {
  return apiFetch(`/api/sales/${id}`, {
    method: 'DELETE',
  })
}

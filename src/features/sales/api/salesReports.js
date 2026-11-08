import { apiFetch } from '@/shared/api/http'

export async function fetchSalesReports(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.status) searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)
  if (params.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.chart_days) searchParams.set('chart_days', String(params.chart_days))

  return apiFetch(`/api/sales-reports?${searchParams}`)
}

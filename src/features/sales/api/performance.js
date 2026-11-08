import { apiFetch } from '@/shared/api/http'

export async function fetchProductPerformanceReport(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.search) searchParams.set('search', params.search)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params.order) searchParams.set('order', params.order)
  if (params.sort_order) searchParams.set('sort_order', params.sort_order)
  return apiFetch(`/api/performance?${searchParams}`)
}

import { apiFetch } from '@/shared/api/http'

export async function fetchDashboardSummary(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.low_stock_threshold) {
    searchParams.set('low_stock_threshold', String(params.low_stock_threshold))
  }
  return apiFetch(`/api/dashboard/summary?${searchParams}`)
}

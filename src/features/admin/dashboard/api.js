import { apiFetch } from '@/shared/api/adminHttp'

/**
 * Fetch platform executive summary and KPIs for the specified date range.
 * @param {Object} options
 * @param {'today' | '7d' | '30d' | 'month'} [options.range='30d']
 */
export async function getPlatformSummary({ range = '30d' } = {}) {
  const params = new URLSearchParams()
  if (range) params.set('range', range)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const json = await apiFetch(`/api/platform/dashboard/summary${qs}`)
  return json.data
}

/**
 * Fetch platform system health status (API, Database latency, SMTP connection).
 */
export async function getPlatformHealth() {
  const json = await apiFetch('/api/platform/dashboard/health')
  return json.data
}

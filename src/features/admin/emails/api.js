import { apiFetch } from '@/shared/api/adminHttp'

export async function getEmailLogs({
  page = 1,
  limit = 20,
  status,
  search,
  templateName,
  tenantId,
  fromDate,
  toDate,
} = {}) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  if (status && status !== 'all') params.set('status', status)
  if (search) params.set('search', search)
  if (templateName) params.set('templateName', templateName)
  if (tenantId) params.set('tenantId', tenantId)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)

  const qs = params.toString() ? `?${params.toString()}` : ''
  const json = await apiFetch(`/api/emails/logs${qs}`)
  return json.data
}

export async function getEmailLog(id) {
  const json = await apiFetch(`/api/emails/logs/${encodeURIComponent(id)}`)
  return json.data
}

export async function getEmailStats({ tenantId, fromDate } = {}) {
  const params = new URLSearchParams()
  if (tenantId) params.set('tenantId', tenantId)
  if (fromDate) params.set('fromDate', fromDate)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const json = await apiFetch(`/api/emails/stats${qs}`)
  return json.data
}

export async function getProviderStatus() {
  const json = await apiFetch('/api/emails/provider')
  return json.data
}

export async function testSmtpConnection(smtpConfig = null) {
  return apiFetch('/api/emails/test-connection', {
    method: 'POST',
    body: JSON.stringify({ smtpConfig }),
  })
}

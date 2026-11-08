import { apiFetch } from '@/shared/api/adminHttp'

export async function listShops({ includeDeleted = false } = {}) {
  const qs = includeDeleted ? '?include_deleted=true' : ''
  const json = await apiFetch(`/api/tenants${qs}`)
  return json.data
}

export async function getShop(slug) {
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}`)
  return json.data
}

export async function createShop(payload) {
  return apiFetch('/api/tenants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateShop(slug, payload) {
  return apiFetch(`/api/tenants/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function softDeleteShop(slug) {
  return apiFetch(`/api/tenants/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })
}

export async function restoreShop(slug) {
  return apiFetch(`/api/tenants/${encodeURIComponent(slug)}/restore`, {
    method: 'POST',
  })
}

export async function setShopStatus(slug, status, reasonData = {}) {
  return apiFetch(`/api/tenants/${encodeURIComponent(slug)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...reasonData }),
  })
}

export async function uploadShopLogo(slug, file, filename = 'logo.jpg') {
  const formData = new FormData()
  formData.append('file', file, filename)
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}/uploads/branding`, {
    method: 'POST',
    body: formData,
  })
  return json.data
}

export async function getShopDetail(slug) {
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}/detail`)
  return json.data
}

export async function getShopUsers(slug) {
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}/users`)
  return json.data
}

export async function getShopActivity(slug, params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page)
  if (params.limit) query.set('limit', params.limit)
  if (params.search) query.set('search', params.search)
  if (params.action && params.action !== 'all') query.set('action', params.action)

  const qs = query.toString() ? `?${query.toString()}` : ''
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}/activity${qs}`)
  return json.data
}

export async function getShopNotes(slug) {
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}/notes`)
  return json.data
}

export async function addShopNote(slug, content) {
  const json = await apiFetch(`/api/tenants/${encodeURIComponent(slug)}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  return json.data
}

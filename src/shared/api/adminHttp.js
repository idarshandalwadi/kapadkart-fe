import { clearAdminToken, getAdminToken } from '@/shared/api/adminToken'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
// Empty string should fall back to the Vite base path (dev proxy prefix)
const API_BASE = import.meta.env.VITE_API_BASE_URL || basePath

// Bumped when the admin signs out so requests already in flight can fail quietly.
let authEpoch = 0

export function retireAdminSession() {
  authEpoch += 1
  clearAdminToken()
}

export async function adminApiFetch(path, options = {}) {
  const epochAtStart = authEpoch
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = {
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  }

  const token = getAdminToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const base = String(API_BASE).replace(/\/$/, '')
  let res
  try {
    res = await fetch(`${base}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    })
  } catch (netErr) {
    if (netErr.name === 'TypeError' || netErr.message?.toLowerCase().includes('fetch')) {
      const connErr = new Error('Cannot connect to KapadKart admin backend service. Please ensure the backend is running.')
      connErr.status = 503
      connErr.cause = netErr
      throw connErr
    }
    throw netErr
  }

  const json = await res.json().catch(() => ({}))

  if (res.status === 401) {
    clearAdminToken()
  }

  if (!res.ok || json.success === false) {
    const error = new Error(json.message || `Request failed (${res.status})`)
    error.status = res.status
    error.data = json.data
    // Logout already dropped this session. Don't surface "Token has been revoked"
    // for requests that were sent before the admin clicked Sign out.
    if (res.status === 401 && epochAtStart !== authEpoch) {
      error.silent = true
    }
    throw error
  }

  return json
}

// Export as both adminApiFetch and apiFetch for backward compatibility in admin features
export const apiFetch = adminApiFetch


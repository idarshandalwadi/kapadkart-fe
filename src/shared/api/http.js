import { API_BASE_URL } from '@/config/api'
import { getTenantSlug, TENANT_HEADER } from '@/shared/tenant/tenant'
import { clearToken, getToken } from './token'
export async function parseResponse(res) {
  let json
  try {
    json = await res.json()
  } catch {
    json = {}
  }

  const isFailed = !res.ok || json.success === false || json.status === 'error'

  if (isFailed) {
    const error = new Error(json.message || `Request failed (${res.status})`)
    error.status = res.status
    error.code =
      json.code ||
      json.error?.code ||
      (res.status === 409
        ? 'CONFLICT'
        : res.status === 404
          ? 'NOT_FOUND'
          : res.status === 403
            ? 'FORBIDDEN'
            : res.status === 400
              ? 'BAD_REQUEST'
              : 'API_ERROR')
    error.fieldErrors = json.fieldErrors || json.error?.fieldErrors || null
    error.details = json.details || json.error?.details || null
    error.data = json.data
    error.raw = json
    throw error
  }
  return json
}

export async function apiFetch(path, options = {}, { auth = 'auto', tenant = true } = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = {
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  }

  if (tenant) {
    headers[TENANT_HEADER] = getTenantSlug()
  }

  // Backward-compatible bearer token injection if legacy token is in storage
  const token = getToken()
  const sendAuth = auth === true || (auth === 'auto' && Boolean(token))
  if (sendAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    const timeoutSignal =
      !options.signal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(15000)
        : undefined

    res = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      signal: options.signal || timeoutSignal,
      headers,
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || (err.name === 'AbortError' && !options.signal)) {
      const timeoutErr = new Error('Request timed out. Please check your network connection and try again.')
      timeoutErr.status = 504
      timeoutErr.code = 'TIMEOUT'
      throw timeoutErr
    }
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
      const connErr = new Error('Network error. Unable to connect to KapadKart server. Please check your internet connection.')
      connErr.status = 503
      connErr.code = 'NETWORK_ERROR'
      connErr.cause = err
      throw connErr
    }
    throw err
  }

  if (res.status === 401) {
    clearToken()
  }

  return parseResponse(res)
}

export async function authFetch(path, options = {}) {
  return apiFetch(path, options, { auth: true })
}


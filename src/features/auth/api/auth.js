import { apiFetch, authFetch } from '@/shared/api/http'
import { clearToken } from '@/shared/api/token'
import { setSessionTenantSlug, setTenantSlug, tenantPath } from '@/shared/tenant/tenant'

export async function login(email, password) {
  const json = await apiFetch(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    { auth: false, tenant: false },
  )

  const tenant = json.data?.tenant || json.tenant
  const slug = tenant?.slug || 'khodal-mahakali-shop'
  const user = json.data?.user || json.user

  setTenantSlug(slug)
  setSessionTenantSlug(slug)
  // Clean up any legacy localStorage token to prevent XSS exfiltration
  clearToken(slug)

  return {
    ...json,
    data: {
      user,
      tenant,
    },
    dashboardPath: tenantPath('/dashboard', slug),
  }
}

export async function logout() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' })
  } finally {
    // caller clears token via AuthContext
  }
}

export async function fetchMe() {
  return authFetch('/api/auth/me')
}

export async function forgotPassword(email) {
  return apiFetch(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
    { auth: false, tenant: false },
  )
}

export async function verifyResetOtp({ email, otp }) {
  return apiFetch(
    '/api/auth/verify-reset-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    },
    { auth: false, tenant: false },
  )
}

export async function resetPassword({ reset_token, new_password, confirm_new_password }) {
  return apiFetch(
    '/api/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify({ reset_token, new_password, confirm_new_password }),
    },
    { auth: false, tenant: false },
  )
}


import { apiFetch, authFetch } from '@/shared/api/http'

/** GET /api/settings */
export async function fetchSettings() {
  return apiFetch('/api/settings')
}

/** PUT /api/settings */
export async function updateSettings(data) {
  return apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** PUT /api/auth/change-password */
export async function changePassword(data) {
  return authFetch('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

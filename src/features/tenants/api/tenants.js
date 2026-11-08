import { apiFetch } from '@/shared/api/http'

export async function fetchTenantBranding(slug) {
  return apiFetch(`/api/tenants/${encodeURIComponent(slug)}/branding`)
}

import { apiFetch } from '@/shared/api/http'

export async function fetchActivities(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  return apiFetch(`/api/activity?${searchParams}`)
}

export async function fetchActivity(id) {
  const json = await apiFetch(`/api/activity/${id}`)
  return json.data
}

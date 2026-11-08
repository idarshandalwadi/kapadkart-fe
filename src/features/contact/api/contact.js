import { apiFetch } from '@/shared/api/http'

/**
 * Submits the Contact Us & Meeting Scheduling form to the backend email API.
 * @param {object} payload
 * @param {string} payload.fullName
 * @param {string} payload.address
 * @param {string} payload.phone
 * @param {string} payload.pincode
 * @param {string} payload.meetingDate
 * @param {string} payload.preferredTime
 * @param {string} [payload.note]
 * @param {string} [payload.website] Honeypot field
 */
export async function scheduleMeeting(payload) {
  return apiFetch(
    '/api/contact/schedule-meeting',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    {
      auth: 'auto',
      tenant: false,
    },
  )
}

/**
 * Checks current daily quota status for the client IP.
 */
export async function getContactRateLimitStatus() {
  return apiFetch(
    '/api/contact/status',
    {
      method: 'GET',
    },
    {
      auth: false,
      tenant: false,
    },
  )
}

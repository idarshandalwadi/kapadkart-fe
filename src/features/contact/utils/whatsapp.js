/**
 * WhatsApp Integration Utilities for KapadKart Meeting Scheduling
 */

export const WHATSAPP_CONTACT_PHONE = '917227807493'
export const WHATSAPP_DISPLAY_PHONE = '+91 7227807493'

/**
 * Builds the URL-encoded WhatsApp message string based on user meeting submission.
 * 
 * Template:
 * Hello KapadKart Team,
 * 
 * I would like to schedule a meeting. Please find my details below:
 * 
 * Name: [Full Name]
 * Address: [Address]
 * Phone Number: [Phone Number]
 * Pincode: [Pincode]
 * Meeting Date: [Meeting Date]
 * Preferred Time: [Preferred Time]
 * Note: [Note]
 * 
 * Please contact me to confirm the meeting.
 * 
 * Thank you.
 * 
 * @param {object} params
 * @param {string} params.fullName
 * @param {string} params.address
 * @param {string} params.phone
 * @param {string} params.pincode
 * @param {string} params.meetingDate
 * @param {string} params.preferredTime
 * @param {string} [params.note]
 * @returns {string} WhatsApp direct URL with prefilled message
 */
export function buildWhatsAppMeetingUrl({
  fullName = '',
  address = '',
  phone = '',
  pincode = '',
  meetingDate = '',
  preferredTime = '',
  note = '',
}) {
  const formattedNote = note && String(note).trim().length > 0 ? String(note).trim() : 'N/A'

  const messageLines = [
    'Hello KapadKart Team,',
    '',
    'I would like to schedule a meeting. Please find my details below:',
    '',
    `Name: ${String(fullName).trim()}`,
    `Address: ${String(address).trim()}`,
    `Phone Number: ${String(phone).trim()}`,
    `Pincode: ${String(pincode).trim()}`,
    `Meeting Date: ${String(meetingDate).trim()}`,
    `Preferred Time: ${String(preferredTime).trim()}`,
    `Note: ${formattedNote}`,
    '',
    'Please contact me to confirm the meeting.',
    '',
    'Thank you.',
  ]

  const rawMessage = messageLines.join('\n')
  const encodedMessage = encodeURIComponent(rawMessage)

  return `https://wa.me/${WHATSAPP_CONTACT_PHONE}?text=${encodedMessage}`
}

/**
 * Safely opens WhatsApp in a new tab/window or native app.
 * @param {string} url
 */
export function openWhatsAppLink(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

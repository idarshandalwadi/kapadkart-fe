/**
 * Centrally Managed Support and Contact Configuration for KapadKart
 */

export const SUPPORT_CONFIG = {
  companyName: 'KapadKart',
  phoneDisplay: '+91 7227807493',
  phoneRaw: '917227807493', // Digits-only international format for wa.me and tel:
  email: 'support@kapadkart.com',
  workingHours: 'Mon – Sat: 10:00 AM – 8:00 PM IST',
  emergencyNote: 'For urgent billing or tenant recovery assistance outside business hours, message our WhatsApp support line.',
}

/**
 * Builds a WhatsApp Click to Chat URL with a sensible prefilled message.
 * Strictly avoids leaking authentication secrets, tokens, or passwords.
 * @param {object} options
 * @param {string} [options.category] - Non-sensitive issue category (e.g. 'OTP Delivery', 'Login Assistance')
 * @returns {string} wa.me URL
 */
export function buildSupportWhatsAppUrl({ category = 'Authentication Assistance' } = {}) {
  const phone = SUPPORT_CONFIG.phoneRaw.replace(/\D/g, '')
  const safeCategory = String(category).trim() || 'Authentication Assistance'
  const message = [
    'Hello Support Team,',
    '',
    'I need assistance with my account. I am facing an issue with the authentication process.',
    '',
    `Issue category: ${safeCategory}`,
    '',
    'Could you please help me?',
    '',
    'Thank you.',
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Builds a mailto: URL with prefilled subject and message body.
 * Strictly avoids leaking authentication secrets, tokens, or passwords.
 * @param {object} options
 * @param {string} [options.category] - Non-sensitive issue category
 * @returns {string} mailto URL
 */
export function buildSupportEmailUrl({ category = 'Authentication Assistance' } = {}) {
  const safeCategory = String(category).trim() || 'Authentication Assistance'
  const subject = `KapadKart Support — ${safeCategory}`
  const body = [
    'Hello Support Team,',
    '',
    'I need assistance with my account. I am experiencing an issue with the authentication process.',
    '',
    `Issue category: ${safeCategory}`,
    '',
    'Please guide me on the next steps.',
    '',
    'Thank you.',
  ].join('\n')

  return `mailto:${encodeURIComponent(SUPPORT_CONFIG.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Builds a tel: dialer URL containing the configured support phone number.
 * @returns {string} tel URL
 */
export function buildSupportTelUrl() {
  const cleanPhone = `+${SUPPORT_CONFIG.phoneRaw.replace(/\D/g, '')}`
  return `tel:${cleanPhone}`
}

/**
 * Builds a WhatsApp URL for requesting a limit increase or plan upgrade.
 * @param {object} options
 * @param {string} [options.resource] - Resource type ('products', 'bookings', 'sales')
 * @param {number} [options.limit] - Configured limit
 * @param {number} [options.current] - Current usage
 * @param {string} [options.tenantSlug] - Shop identifier
 * @returns {string} wa.me URL
 */
export function buildUsageLimitWhatsAppUrl({ resource = 'items', limit, current, tenantSlug } = {}) {
  const phone = SUPPORT_CONFIG.phoneRaw.replace(/\D/g, '')
  const safeResource = String(resource).trim() || 'resources'
  const usageText = limit ? ` (${current !== undefined ? `${current} of ${limit}` : `${limit} limit`})` : ''
  const shopText = tenantSlug ? ` for shop "${tenantSlug}"` : ''
  const message = [
    'Hello KapadKart Support Team,',
    '',
    `Our shop has reached its ${safeResource} limit${usageText}${shopText}.`,
    'We would like to upgrade our plan or increase our account capacity.',
    '',
    'Please assist us with the upgrade options.',
    '',
    'Thank you.',
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}


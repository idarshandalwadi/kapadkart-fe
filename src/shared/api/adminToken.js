const TOKEN_STORAGE = 'kapadkart_admin_token'
const LEGACY_TOKEN_STORAGE = 'kapadkart_admin_token'

export function getAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE) || sessionStorage.getItem(LEGACY_TOKEN_STORAGE) || ''
  } catch {
    return ''
  }
}

/**
 * Deprecated: admin session is managed via HttpOnly cookies.
 * Does not write tokens to sessionStorage.
 */
export function setAdminToken(_token) {
  clearAdminToken()
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE)
    sessionStorage.removeItem(LEGACY_TOKEN_STORAGE)
  } catch {
    // Ignore restricted storage errors
  }
}

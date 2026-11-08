import { AUTH_TOKEN_KEY_PREFIX, getTenantSlug } from '@/shared/tenant/tenant'

function tokenKey(slug = getTenantSlug()) {
  return `${AUTH_TOKEN_KEY_PREFIX}${slug}`
}

/**
 * Migration helper: read legacy token if present, returns null once migrated
 */
export function getToken(slug) {
  try {
    return localStorage.getItem(tokenKey(slug))
  } catch {
    return null
  }
}

/**
 * Deprecated: authentication is managed via HttpOnly cookies.
 * Does not write tokens to localStorage to prevent XSS exposure.
 */
export function setToken(_token, slug) {
  clearToken(slug)
}

/**
 * Purges legacy authentication tokens from localStorage
 */
export function clearToken(slug) {
  try {
    localStorage.removeItem(tokenKey(slug))
    if (!slug) {
      // Clear any remaining legacy auth token keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(AUTH_TOKEN_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch {
    // Storage access may be restricted in private/sandbox mode
  }
}

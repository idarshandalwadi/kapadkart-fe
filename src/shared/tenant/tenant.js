const DEFAULT_TENANT_SLUG =
  import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'khodal-mahakali-shop'

const TENANT_HEADER = 'X-Tenant-Slug'
const TENANT_STORAGE_KEY = 'tenant_slug'
const SESSION_TENANT_STORAGE_KEY = 'session_tenant_slug'
const AUTH_TOKEN_KEY_PREFIX = 'auth_token:'

function stripBasename(pathname) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  if (base && pathname.toLowerCase().startsWith(base.toLowerCase())) {
    return pathname.slice(base.length) || '/'
  }
  return pathname
}

export function getTenantSlugFromLocation() {
  if (typeof window === 'undefined') return null
  const path = stripBasename(window.location.pathname)
  const match = path.match(/^\/t\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).toLowerCase() : null
}

/** Sessions created before the session key existed only left an auth token behind. */
function findTokenOwnerSlug() {
  const stored = localStorage.getItem(TENANT_STORAGE_KEY)
  if (stored && localStorage.getItem(`${AUTH_TOKEN_KEY_PREFIX}${stored}`)) return stored

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(AUTH_TOKEN_KEY_PREFIX)) {
      return key.slice(AUTH_TOKEN_KEY_PREFIX.length)
    }
  }
  return null
}

/** Shop of the signed-in session. Only one shop can be active per browser. */
export function getSessionTenantSlug() {
  if (typeof window === 'undefined') return null

  const active = localStorage.getItem(SESSION_TENANT_STORAGE_KEY)
  if (active) return active

  const adopted = findTokenOwnerSlug()
  if (adopted) {
    localStorage.setItem(SESSION_TENANT_STORAGE_KEY, adopted)
    return adopted
  }
  return null
}

export function setSessionTenantSlug(slug) {
  const next = String(slug || '').trim().toLowerCase()
  if (!next) return null
  localStorage.setItem(SESSION_TENANT_STORAGE_KEY, next)
  return next
}

export function clearSessionTenantSlug() {
  localStorage.removeItem(SESSION_TENANT_STORAGE_KEY)
}

export function getTenantSlug() {
  return (
    getSessionTenantSlug() ||
    getTenantSlugFromLocation() ||
    localStorage.getItem(TENANT_STORAGE_KEY) ||
    DEFAULT_TENANT_SLUG
  )
}

export function setTenantSlug(slug) {
  const next = String(slug || DEFAULT_TENANT_SLUG).trim().toLowerCase()
  localStorage.setItem(TENANT_STORAGE_KEY, next)
  return next
}

export function tenantPath(path = '/', slug = getTenantSlug()) {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (clean === '/') return `/t/${slug}`
  return `/t/${slug}${clean}`
}

export function resolveBrandAssetUrl(path) {
  if (!path || !String(path).trim()) return ''
  const value = String(path).trim()
  if (/^(data:|blob:|https?:\/\/)/i.test(value) || value.startsWith('//')) {
    return value.startsWith('//') ? `https:${value}` : value
  }
  const base = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.BASE_URL || '')
    .replace(/\/$/, '')
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${base}${normalized}`
}

export {
  DEFAULT_TENANT_SLUG,
  TENANT_HEADER,
  TENANT_STORAGE_KEY,
  SESSION_TENANT_STORAGE_KEY,
  AUTH_TOKEN_KEY_PREFIX,
}

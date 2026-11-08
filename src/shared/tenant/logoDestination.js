/**
 * Pure resolver function for context-aware logo destination URL.
 * @param {object} [params]
 * @param {boolean} [params.isAdmin]
 * @param {boolean} [params.isTenant]
 * @param {string} [params.tenantSlug]
 * @param {string} [params.currentPath]
 * @returns {string} Destination URL
 */
export function resolveLogoDestination({
  isAdmin = false,
  isTenant = false,
  tenantSlug = '',
  currentPath = '',
} = {}) {
  // 1. If user is an authenticated platform admin
  if (isAdmin && (currentPath.startsWith('/admin') || !isTenant)) {
    return '/admin/dashboard'
  }

  // 2. If user is an authenticated tenant/shop user
  if (isTenant && tenantSlug) {
    const cleanSlug = String(tenantSlug).trim().toLowerCase()
    return `/t/${cleanSlug}/dashboard`
  }

  // 3. If unauthenticated guest
  return '/'
}

export default resolveLogoDestination

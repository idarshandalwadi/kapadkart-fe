import { useLocation } from 'react-router-dom'
import { useAuth as useTenantAuth } from '@/features/auth/context/AuthContext'
import { useAuth as useAdminAuth } from '@/features/admin/auth/AuthContext'
import { getTenantSlug, tenantPath } from '@/shared/tenant/tenant'
import { getAdminToken } from '@/shared/api/adminToken'

import { resolveLogoDestination } from '@/shared/tenant/logoDestination'

export { resolveLogoDestination }

/**
 * React hook that returns the context-aware destination URL for any header logo click:
 * - Guest (not logged in): '/' (Home Page)
 * - Tenant User (logged in): '/t/:slug/dashboard' (Tenant Dashboard)
 * - Platform Admin (logged in): '/admin/dashboard' (Admin Dashboard)
 */
export function useLogoDestination() {
  const location = useLocation()
  const tenantAuth = useTenantAuth()
  const adminAuth = useAdminAuth()

  const slug = getTenantSlug()
  const hasAdminToken = Boolean(getAdminToken())
  const isAdmin = Boolean(adminAuth?.authenticated || hasAdminToken)
  const isTenant = Boolean(tenantAuth?.isAuthenticated && tenantAuth?.user)

  return resolveLogoDestination({
    isAdmin,
    isTenant,
    tenantSlug: slug,
    currentPath: location.pathname || '',
  })
}

export default useLogoDestination

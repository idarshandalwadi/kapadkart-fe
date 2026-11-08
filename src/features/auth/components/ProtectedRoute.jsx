import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getSessionTenantSlug, tenantPath } from '@/shared/tenant/tenant'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { tenantSlug } = useParams()
  const location = useLocation()

  if (loading) {
    return <div className="auth-loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const sessionSlug = getSessionTenantSlug()
  const urlSlug = String(tenantSlug || '').trim().toLowerCase()

  // One shop per browser session: keep the signed-in user inside their own shop
  // instead of bouncing them to login when the URL points at another shop.
  if (sessionSlug && urlSlug && urlSlug !== sessionSlug) {
    const subPath = location.pathname.replace(/^\/t\/[^/]+/, '') || '/dashboard'
    return <Navigate to={`${tenantPath(subPath, sessionSlug)}${location.search}`} replace />
  }

  return <Outlet />
}

export default ProtectedRoute

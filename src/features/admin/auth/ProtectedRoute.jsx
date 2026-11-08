import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/admin/auth/AuthContext'

export default function ProtectedRoute() {
  const { authenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-accent" aria-hidden="true" />
      </div>
    )
  }

  if (!authenticated) return <Navigate to="/admin/login" replace />
  return <Outlet />
}

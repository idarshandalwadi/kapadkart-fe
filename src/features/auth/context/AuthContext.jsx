import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchMe, login as apiLogin, logout as apiLogout } from '@/features/auth/api/auth'
import { clearToken, getToken } from '@/shared/api/token'
import { clearSessionTenantSlug, getTenantSlug } from '@/shared/tenant/tenant'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const location = useLocation()
  // Session shop wins over the URL so another shop's link cannot drop the session.
  const tenantSlug = getTenantSlug()
  // Re-read slug when the URL / storage context changes
  void location.pathname

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleGlobalLogout = () => {
      setUser(null)
    }
    window.addEventListener('kapadkart-auth-logout', handleGlobalLogout)
    return () => {
      window.removeEventListener('kapadkart-auth-logout', handleGlobalLogout)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initAuth = async () => {
      setLoading(true)
      try {
        const json = await fetchMe()
        if (!cancelled) {
          const role = json?.role || json?.data?.role
          const u = json.data?.user || json.user || json.data
          const tenant = json.data?.tenant || json.tenant
          if (role === 'tenant_user' && u && tenant) {
            setUser({ ...u, tenant: u.tenant || tenant })
          } else {
            setUser(null)
          }
        }
      } catch {
        clearToken(tenantSlug)
        clearSessionTenantSlug()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initAuth()
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  const login = useCallback(async (email, password) => {
    const json = await apiLogin(email, password)
    const u = json.data?.user || json.user
    const tenant = json.data?.tenant || json.tenant
    setUser(u ? { ...u, tenant: u.tenant || tenant } : null)
    return json
  }, [])

  const logout = useCallback(async () => {
    const slug = getTenantSlug()
    try {
      await apiLogout()
    } catch {
      // Token may already be invalid; still clear local session.
    } finally {
      clearToken(slug)
      clearSessionTenantSlug()
      setUser(null)
      window.dispatchEvent(new Event('kapadkart-auth-logout'))
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: Boolean(user), login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

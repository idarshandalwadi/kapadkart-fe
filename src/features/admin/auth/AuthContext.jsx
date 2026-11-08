import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearAdminToken, getAdminToken } from '@/shared/api/adminToken'
import { apiFetch, retireAdminSession } from '@/shared/api/adminHttp'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAdminToken()))
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleGlobalLogout = () => {
      setAuthenticated(false)
      setAdminUser(null)
    }
    window.addEventListener('kapadkart-auth-logout', handleGlobalLogout)
    return () => {
      window.removeEventListener('kapadkart-auth-logout', handleGlobalLogout)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initAdmin = async () => {
      try {
        const json = await apiFetch('/api/platform-auth/me')
        const role = json?.role || json?.data?.role
        if (!cancelled && role === 'platform_admin' && (json?.user || json?.data?.user)) {
          setAuthenticated(true)
          setAdminUser(json.user || json.data?.user)
        } else if (!cancelled) {
          setAuthenticated(false)
          setAdminUser(null)
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false)
          setAdminUser(null)
          clearAdminToken()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initAdmin()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const json = await apiFetch('/api/platform-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: String(email).trim(), password }),
    })
    // Clean up any legacy sessionStorage token
    clearAdminToken()
    setAuthenticated(true)
    setAdminUser(json?.data?.user || json?.user)
    return json.data
  }, [])

  const logout = useCallback(async () => {
    retireAdminSession()
    setAuthenticated(false)
    setAdminUser(null)
    window.dispatchEvent(new Event('kapadkart-auth-logout'))
    try {
      await apiFetch('/api/platform-auth/logout', {
        method: 'POST',
      })
    } catch {
      // Local session is already cleared.
    }
  }, [])

  const value = useMemo(
    () => ({ authenticated, adminUser, loading, login, logout }),
    [authenticated, adminUser, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

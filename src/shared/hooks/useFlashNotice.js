import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

/**
 * Shows a one-shot toast from `location.state.notice` after navigation, then clears it.
 * Accepts either a string or `{ message, type }` where type is success|error|warning|info.
 */
export function useFlashNotice() {
  const location = useLocation()
  const navigate = useNavigate()
  const shownKeyRef = useRef(null)

  useEffect(() => {
    const raw = location.state?.notice ?? location.state?.message
    if (!raw) return

    const payload =
      typeof raw === 'string'
        ? { message: raw, type: location.state?.noticeType || 'success' }
        : {
            message: raw.message,
            type: raw.type || location.state?.noticeType || 'success',
          }

    if (!payload.message) return

    const dedupeKey = `${location.key}:${payload.type}:${payload.message}`
    if (shownKeyRef.current === dedupeKey) return
    shownKeyRef.current = dedupeKey

    const show =
      {
        success: toast.success,
        error: toast.error,
        warning: toast.warning,
        info: toast.info,
      }[payload.type] || toast

    show(payload.message)

    const { notice: _n, noticeType: _t, message: _m, ...rest } = location.state || {}
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: Object.keys(rest).length ? rest : null },
    )
  }, [location, navigate])
}

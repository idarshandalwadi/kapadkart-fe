import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import PasswordInput from '@/features/auth/components/PasswordInput'
import { useAuth } from '@/features/auth/context/AuthContext'
import BrandLogo from '@/shared/components/BrandLogo'
import { tenantPath } from '@/shared/tenant/tenant'
import { cn } from '@/shared/utils/cn'
import { FormErrorAlert } from '@/shared/components/FormErrorAlert'

const PLATFORM_NAME = 'KapadKart'
const FALLBACK_LOGO = `${import.meta.env.BASE_URL}kapad-kart-logo.svg`

function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // If already signed in for a stored shop, go straight to that dashboard.
  if (!loading && isAuthenticated) {
    return <Navigate to={tenantPath('/dashboard')} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const result = await login(email.trim(), password)
      toast.success('Signed in successfully')
      navigate(result.dashboardPath || tenantPath('/dashboard'), { replace: true })
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-screen animate-fade-up flex-col items-center justify-center p-6',
        'bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(245,158,11,0.14),transparent_50%),radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(26,28,30,0.05),transparent_45%),linear-gradient(165deg,var(--color-canvas-top),var(--color-canvas-bottom))]',
      )}
    >
      <div className="mb-3 w-full max-w-[420px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text"
        >
          <i className="fa-solid fa-arrow-left text-[11px]" aria-hidden="true" />
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-[420px] rounded-[14px] border border-border bg-surface px-8 py-[2.15rem] shadow-md">
        <div className="mb-4 flex justify-center">
          <Link to="/" title="Go to KapadKart Home" className="transition-opacity hover:opacity-85">
            <BrandLogo
              src={FALLBACK_LOGO}
              alt={PLATFORM_NAME}
              surface="light"
              imgClassName="h-12 w-auto max-w-[220px]"
            />
          </Link>
        </div>
        {/* <h1 className="m-0 text-center font-display text-[1.85rem] font-semibold tracking-[-0.03em] text-text">
          {PLATFORM_NAME}
        </h1> */}
        <p className="mt-[0.4rem] mb-[1.6rem] text-center text-[0.95rem] text-text-secondary">
          Sign in to your shop account
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-[0.35rem]">
            <label htmlFor="email" className="text-[0.8rem] font-semibold text-text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className={cn(
                'rounded-md border border-border bg-surface px-3 py-[0.65rem] text-[0.95rem] text-text transition-[border-color,box-shadow] duration-160',
                'focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none',
              )}
            />
          </div>

          <div className="flex flex-col gap-[0.35rem]">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[0.8rem] font-semibold text-text-secondary">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[0.8rem] font-medium text-accent hover:text-accent-hover hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <FormErrorAlert message={error} onDismiss={() => setError(null)} />

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'mt-2 cursor-pointer rounded-[10px] border-0 bg-accent px-4 py-3 text-[0.95rem] font-semibold text-white transition-[background,transform] duration-160',
              'enabled:hover:bg-accent-hover enabled:active:translate-y-px',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-border" />
          <span className="absolute bg-surface px-3 text-[0.75rem] font-medium tracking-wider text-text-muted uppercase">
            or
          </span>
        </div>

        <div className="relative group inline-flex w-full justify-center" title="Coming soon">
          <button
            type="button"
            disabled
            className={cn(
              'flex w-full items-center justify-center gap-3 rounded-[10px] border border-border bg-surface-muted/60 px-4 py-3 text-[0.95rem] font-semibold text-text-muted',
              'cursor-not-allowed opacity-75 transition-colors duration-160',
            )}
            aria-disabled="true"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Login with Google</span>
          </button>

          {/* Tooltip on hover */}
          <div
            role="tooltip"
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 -translate-y-1 scale-95 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 z-20"
          >
            <div className="relative rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white shadow-md whitespace-nowrap">
              Coming soon
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-border/80 pt-4 text-center">
          <p className="m-0 text-xs text-text-secondary">
            Having trouble signing in?{' '}
            <Link
              to="/contact?reason=login"
              className="font-semibold text-accent hover:text-accent-hover hover:underline"
            >
              Contact Support for Assistance
            </Link>
          </p>
          <p className="m-0 text-xs text-text-secondary">
            Looking for a store visit or consultation?{' '}
            <Link
              to="/contact"
              className="font-semibold text-accent hover:text-accent-hover hover:underline"
            >
              Schedule Meeting
            </Link>
          </p>
          <p className="m-0 text-xs text-text-secondary">
            Platform administrator?{' '}
            <Link
              to="/admin/login"
              className="font-semibold text-accent hover:text-accent-hover hover:underline"
            >
              Admin Sign In →
            </Link>
          </p>
          <p className="m-0 pt-1 text-xs text-text-secondary">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium text-text-secondary transition-colors hover:text-text hover:underline"
            >
              <i className="fa-solid fa-house text-[10px]" aria-hidden="true" />
              Return to KapadKart Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage


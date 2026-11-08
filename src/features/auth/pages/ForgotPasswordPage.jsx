import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import BrandLogo from '@/shared/components/BrandLogo'
import { forgotPassword, verifyResetOtp, resetPassword } from '@/features/auth/api/auth'
import { cn } from '@/shared/utils/cn'
import { FormErrorAlert } from '@/shared/components/FormErrorAlert'

const PLATFORM_NAME = 'KapadKart'
const FALLBACK_LOGO = `${import.meta.env.BASE_URL}kapad-kart-logo.svg`

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // Steps: 'email' (1) | 'otp' (2) | 'password' (3) | 'success' (4)
  const [step, setStep] = useState('email')

  // Form states
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetToken, setResetToken] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const COOLDOWN_KEY = 'kapadkart_otp_cooldown_until'
  const [resendCooldown, setResendCooldown] = useState(0)
  const [expiryMinutes, setExpiryMinutes] = useState(10)
  const [otpLength, setOtpLength] = useState(6)

  const otpInputRef = useRef(null)

  // Restore cooldown from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(COOLDOWN_KEY)
    if (stored) {
      const remaining = Math.ceil((parseInt(stored, 10) - Date.now()) / 1000)
      if (remaining > 0) {
        setResendCooldown(remaining)
      } else {
        sessionStorage.removeItem(COOLDOWN_KEY)
      }
    }
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      sessionStorage.removeItem(COOLDOWN_KEY)
      return
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem(COOLDOWN_KEY)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const setCooldown = (seconds = 120) => {
    setResendCooldown(seconds)
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000))
  }

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Auto focus on OTP when entering step 2
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [step])

  // STEP 1: Request OTP
  const handleRequestOtp = async (e) => {
    e?.preventDefault()
    if (!email || !email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await forgotPassword(email.trim())
      const data = res.data || {}
      if (data.otp_length) setOtpLength(data.otp_length)
      if (data.expiry_minutes) setExpiryMinutes(data.expiry_minutes)
      setCooldown(data.resend_cooldown || 120)

      toast.success('Verification code sent to your email')
      setStep('otp')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    if (!otp || otp.trim().length < 4) {
      setError(`Please enter the ${otpLength}-digit verification code`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await verifyResetOtp({
        email: email.trim(),
        otp: otp.trim(),
      })

      const token = res.data?.reset_token
      if (!token) {
        throw new Error('Verification succeeded but reset authorization token was missing')
      }

      setResetToken(token)
      toast.success('Code verified successfully!')
      setStep('password')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await forgotPassword(email.trim())
      const data = res.data || {}
      setCooldown(data.resend_cooldown || 120)
      setOtp('')
      toast.success('A new verification code has been sent!')
    } catch (err) {
      if (err.retry_after_seconds) {
        setCooldown(err.retry_after_seconds)
      }
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e?.preventDefault()
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await resetPassword({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      })

      toast.success('Password reset successfully!')
      setStep('success')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-screen animate-fade-up items-center justify-center p-6',
        'bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(245,158,11,0.14),transparent_50%),radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(26,28,30,0.05),transparent_45%),linear-gradient(165deg,var(--color-canvas-top),var(--color-canvas-bottom))]',
      )}
    >
      <div className="w-full max-w-[440px] rounded-[14px] border border-border bg-surface px-8 py-[2.15rem] shadow-md">
        {/* Brand Logo & Header */}
        <div className="mb-4 flex justify-center">
          <BrandLogo
            src={FALLBACK_LOGO}
            alt={PLATFORM_NAME}
            surface="light"
            imgClassName="h-12 w-auto max-w-[220px]"
          />
        </div>

        {/* Step Indicator */}
        {step !== 'success' && (
          <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  step === 'email'
                    ? 'bg-accent text-white'
                    : 'bg-emerald-600 text-white',
                )}
              >
                1
              </span>
              <span className={cn('text-xs font-medium', step === 'email' ? 'text-text font-semibold' : 'text-text-secondary')}>
                Email
              </span>
            </div>
            <div className="h-0.5 w-6 bg-border" />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  step === 'otp'
                    ? 'bg-accent text-white'
                    : step === 'password'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-border text-text-secondary',
                )}
              >
                2
              </span>
              <span className={cn('text-xs font-medium', step === 'otp' ? 'text-text font-semibold' : 'text-text-secondary')}>
                OTP Code
              </span>
            </div>
            <div className="h-0.5 w-6 bg-border" />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  step === 'password' ? 'bg-accent text-white' : 'bg-border text-text-secondary',
                )}
              >
                3
              </span>
              <span className={cn('text-xs font-medium', step === 'password' ? 'text-text font-semibold' : 'text-text-secondary')}>
                Password
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 'email' && (
          <div>
            <h1 className="m-0 text-center font-display text-[1.65rem] font-semibold tracking-[-0.03em] text-text">
              Forgot Password?
            </h1>
            <p className="mt-[0.4rem] mb-[1.6rem] text-center text-[0.92rem] text-text-secondary">
              Enter your registered email address to receive a secure OTP code.
            </p>

            <form className="flex flex-col gap-4" onSubmit={handleRequestOtp}>
              <div className="flex flex-col gap-[0.35rem]">
                <label htmlFor="reset-email" className="text-[0.8rem] font-semibold text-text-secondary">
                  Registered Email Address
                </label>
                <div className="relative flex items-center">
                  <i className="fa-solid fa-envelope absolute left-3.5 text-text-secondary text-sm" aria-hidden="true" />
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className={cn(
                      'w-full rounded-md border border-border bg-surface py-[0.65rem] pr-3 pl-10 text-[0.95rem] text-text transition-[border-color,box-shadow] duration-160',
                      'focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none',
                    )}
                  />
                </div>
              </div>

              <FormErrorAlert message={error} onDismiss={() => setError(null)} />

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className={cn(
                  'mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-accent px-4 py-3 text-[0.95rem] font-semibold text-white transition-[background,transform] duration-160',
                  'enabled:hover:bg-accent-hover enabled:active:translate-y-px',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <div className="mt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-text-secondary hover:text-accent hover:underline"
                >
                  <i className="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <div>
            <h1 className="m-0 text-center font-display text-[1.65rem] font-semibold tracking-[-0.03em] text-text">
              Enter Verification Code
            </h1>
            <p className="mt-[0.4rem] mb-2 text-center text-[0.92rem] text-text-secondary">
              We sent a verification code to <span className="font-semibold text-text">{email}</span>
            </p>
            <div className="mb-4 flex items-center justify-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <i className="fa-solid fa-clock text-xs" aria-hidden="true" />
              <span>Valid for {expiryMinutes} minutes</span>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp}>
              <div className="flex flex-col gap-[0.35rem]">
                <label htmlFor="otp-input" className="text-[0.8rem] font-semibold text-text-secondary">
                  {otpLength}-Digit Verification Code (OTP)
                </label>
                <div className="relative flex items-center">
                  <i className="fa-solid fa-key absolute left-3.5 text-text-secondary text-sm" aria-hidden="true" />
                  <input
                    id="otp-input"
                    ref={otpInputRef}
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={otpLength}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    autoComplete="one-time-code"
                    required
                    className={cn(
                      'w-full rounded-md border border-border bg-surface py-[0.65rem] pr-3 pl-10 text-center font-mono text-xl font-bold tracking-[0.35em] text-text transition-[border-color,box-shadow] duration-160',
                      'focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none',
                    )}
                  />
                </div>
              </div>

              <FormErrorAlert message={error} onDismiss={() => setError(null)} />

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className={cn(
                  'mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-accent px-4 py-3 text-[0.95rem] font-semibold text-white transition-[background,transform] duration-160',
                  'enabled:hover:bg-accent-hover enabled:active:translate-y-px',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {loading ? 'Verifying Code...' : 'Verify Code & Proceed'}
              </button>

              {/* Resend & Back controls */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setError(null)
                  }}
                  className="cursor-pointer text-text-secondary hover:text-text hover:underline"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className={cn(
                    'font-medium transition-colors',
                    resendCooldown > 0
                      ? 'cursor-not-allowed text-text-secondary'
                      : 'cursor-pointer text-accent hover:text-accent-hover hover:underline',
                  )}
                >
                  {resendCooldown > 0 ? `Resend OTP in ${formatCountdown(resendCooldown)}` : 'Resend OTP'}
                </button>
              </div>

              <div className="mt-3 border-t border-border/80 pt-3 text-center">
                <p className="m-0 text-xs text-text-secondary">
                  Having trouble receiving your OTP?{' '}
                  <Link
                    to="/contact?reason=otp"
                    className="font-semibold text-accent hover:text-accent-hover hover:underline"
                  >
                    Contact Support
                  </Link>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 'password' && (
          <div>
            <h1 className="m-0 text-center font-display text-[1.65rem] font-semibold tracking-[-0.03em] text-text">
              Set New Password
            </h1>
            <p className="mt-[0.4rem] mb-[1.6rem] text-center text-[0.92rem] text-text-secondary">
              Create a secure new password for your account.
            </p>

            <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
              <div className="flex flex-col gap-[0.35rem]">
                <label htmlFor="new-password" className="text-[0.8rem] font-semibold text-text-secondary">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <i className="fa-solid fa-lock absolute left-3.5 text-text-secondary text-sm" aria-hidden="true" />
                  <input
                    id="new-password"
                    name="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                    className={cn(
                      'w-full rounded-md border border-border bg-surface py-[0.65rem] pr-10 pl-10 text-[0.95rem] text-text transition-[border-color,box-shadow] duration-160',
                      'focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 cursor-pointer text-text-secondary hover:text-text"
                  >
                    <i className={cn('fa-solid text-sm', showNewPassword ? 'fa-eye-slash' : 'fa-eye')} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-[0.35rem]">
                <label htmlFor="confirm-password" className="text-[0.8rem] font-semibold text-text-secondary">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <i className="fa-solid fa-shield-halved absolute left-3.5 text-text-secondary text-sm" aria-hidden="true" />
                  <input
                    id="confirm-password"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                    className={cn(
                      'w-full rounded-md border border-border bg-surface py-[0.65rem] pr-10 pl-10 text-[0.95rem] text-text transition-[border-color,box-shadow] duration-160',
                      'focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 cursor-pointer text-text-secondary hover:text-text"
                  >
                    <i className={cn('fa-solid text-sm', showConfirmPassword ? 'fa-eye-slash' : 'fa-eye')} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <FormErrorAlert message={error} onDismiss={() => setError(null)} />

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className={cn(
                  'mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-accent px-4 py-3 text-[0.95rem] font-semibold text-white transition-[background,transform] duration-160',
                  'enabled:hover:bg-accent-hover enabled:active:translate-y-px',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {loading ? 'Updating Password...' : 'Reset Password & Save'}
              </button>

              <div className="mt-3 border-t border-border/80 pt-3 text-center">
                <p className="m-0 text-xs text-text-secondary">
                  Having trouble resetting your password?{' '}
                  <Link
                    to="/contact?reason=password_reset"
                    className="font-semibold text-accent hover:text-accent-hover hover:underline"
                  >
                    Contact Support
                  </Link>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <i className="fa-solid fa-circle-check text-3xl" aria-hidden="true" />
            </div>

            <h1 className="m-0 font-display text-[1.65rem] font-semibold tracking-[-0.03em] text-text">
              Password Changed!
            </h1>
            <p className="mt-[0.5rem] mb-[1.8rem] text-[0.92rem] text-text-secondary">
              Your password has been reset successfully. You can now sign in to your shop with your new credentials.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className={cn(
                'w-full cursor-pointer rounded-[10px] border-0 bg-accent px-4 py-3 text-[0.95rem] font-semibold text-white transition-[background,transform] duration-160',
                'hover:bg-accent-hover active:translate-y-px',
              )}
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/contact"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent hover:underline"
        >
          <i className="fa-solid fa-headset" aria-hidden="true" />
          Need assistance? Contact KapadKart Support
        </Link>
      </div>
    </div>
  )
}

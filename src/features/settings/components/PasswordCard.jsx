import { useMemo, useState } from 'react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { cn } from '@/shared/utils/cn'

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: '', color: 'bg-border', text: '' }
  let score = 0
  if (pass.length >= 6) score += 1
  if (pass.length >= 10) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass)) score += 1

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' }
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' }
  return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' }
}

function PasswordInputWithToggle({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  'aria-describedby': ariaDescribedby,
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={ariaDescribedby}
        className={cn(
          'h-11 sm:h-12 w-full rounded-xl border bg-white px-3.5 pr-11 text-sm text-text transition-all duration-160',
          'placeholder:text-text-muted/60 placeholder:italic',
          'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
          error ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
        )}
      />
      <button
        type="button"
        className="absolute right-2.5 size-7 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted flex items-center justify-center transition cursor-pointer"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <i className={cn('fa-solid text-xs', show ? 'fa-eye-slash' : 'fa-eye')} aria-hidden="true" />
      </button>
    </div>
  )
}

function PasswordCard({
  passwordForm,
  passwordFieldErrors,
  passwordError,
  changingPassword,
  passwordConfirmOpen,
  setPasswordConfirmOpen,
  onPasswordChange,
  onPasswordSubmit,
  onPasswordConfirm,
}) {
  const [collapsed, setCollapsed] = useState(false)

  const strength = useMemo(
    () => calculatePasswordStrength(passwordForm.new_password),
    [passwordForm.new_password],
  )

  const passwordsMatch =
    passwordForm.new_password &&
    passwordForm.confirm_new_password &&
    passwordForm.new_password === passwordForm.confirm_new_password

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden transition-all duration-200">
      {/* Header with Collapsible Toggle for Mobile */}
      <div
        className="flex items-center justify-between p-4 sm:p-6 cursor-pointer select-none bg-surface hover:bg-surface-muted/30 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCollapsed((c) => !c)
          }
        }}
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-accent text-sm">
            <i className="fa-solid fa-lock" aria-hidden="true" />
          </span>
          <div>
            <h2 className="m-0 font-display text-[1.12rem] font-semibold text-text">
              Change Password
            </h2>
            <p className="m-0 text-xs text-text-secondary">
              Update account login credentials and security.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="size-8 rounded-lg text-text-muted hover:text-text flex items-center justify-center transition cursor-pointer"
          aria-label={collapsed ? 'Expand password section' : 'Collapse password section'}
        >
          <i
            className={cn(
              'fa-solid fa-chevron-down text-xs transition-transform duration-200',
              collapsed && '-rotate-90',
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {!collapsed && (
        <form
          className="p-4 sm:p-6 pt-0 sm:pt-0 flex flex-col gap-4 border-t border-border/60 mt-0"
          onSubmit={onPasswordSubmit}
          noValidate
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="current_password" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                Current Password <span className="text-amber-600 font-bold">*</span>
              </label>
              <PasswordInputWithToggle
                id="current_password"
                name="current_password"
                value={passwordForm.current_password}
                onChange={onPasswordChange}
                placeholder="Enter current password"
                autoComplete="current-password"
                error={passwordFieldErrors.current_password}
                aria-describedby={
                  passwordFieldErrors.current_password ? 'current-password-err' : undefined
                }
              />
              {passwordFieldErrors.current_password && (
                <p id="current-password-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                  <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                  <span>{passwordFieldErrors.current_password}</span>
                </p>
              )}
            </div>

            <div className="hidden sm:block" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new_password" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                New Password <span className="text-amber-600 font-bold">*</span>
              </label>
              <PasswordInputWithToggle
                id="new_password"
                name="new_password"
                value={passwordForm.new_password}
                onChange={onPasswordChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                error={passwordFieldErrors.new_password}
                aria-describedby={passwordFieldErrors.new_password ? 'new-password-err' : undefined}
              />
              {passwordFieldErrors.new_password && (
                <p id="new-password-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                  <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                  <span>{passwordFieldErrors.new_password}</span>
                </p>
              )}

              {/* Password strength meter */}
              {passwordForm.new_password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-border/60 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={cn(
                        'h-full flex-1 rounded-full transition-all duration-200',
                        strength.score >= 1 ? strength.color : 'bg-transparent',
                      )}
                    />
                    <div
                      className={cn(
                        'h-full flex-1 rounded-full transition-all duration-200',
                        strength.score >= 2 ? strength.color : 'bg-transparent',
                      )}
                    />
                    <div
                      className={cn(
                        'h-full flex-1 rounded-full transition-all duration-200',
                        strength.score >= 3 ? strength.color : 'bg-transparent',
                      )}
                    />
                  </div>
                  <span className={cn('text-[0.7rem] font-bold uppercase tracking-wider', strength.text)}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm_new_password" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                Confirm New Password <span className="text-amber-600 font-bold">*</span>
              </label>
              <PasswordInputWithToggle
                id="confirm_new_password"
                name="confirm_new_password"
                value={passwordForm.confirm_new_password}
                onChange={onPasswordChange}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={passwordFieldErrors.confirm_new_password}
                aria-describedby={
                  passwordFieldErrors.confirm_new_password ? 'confirm-password-err' : undefined
                }
              />
              {passwordFieldErrors.confirm_new_password && (
                <p id="confirm-password-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                  <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                  <span>{passwordFieldErrors.confirm_new_password}</span>
                </p>
              )}

              {/* Passwords match checkmark */}
              {passwordsMatch && (
                <p className="m-0 text-[0.75rem] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                  <i className="fa-solid fa-check text-xs" aria-hidden="true" />
                  <span>Passwords match</span>
                </p>
              )}
            </div>
          </div>

          {passwordError && (
            <p className="m-0 text-[0.82rem] text-rose-600 font-semibold flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <i className="fa-solid fa-circle-exclamation text-sm" aria-hidden="true" />
              <span>{passwordError}</span>
            </p>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn-primary h-11 px-5 text-sm rounded-xl"
              disabled={changingPassword}
            >
              {changingPassword ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" aria-hidden="true" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-key text-xs" aria-hidden="true" />
                  <span>Change Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={passwordConfirmOpen}
        title="Change Password"
        message="You will be signed out and need to log in again with your new password. Continue?"
        confirmLabel="Change Password"
        variant="default"
        loading={changingPassword}
        onConfirm={onPasswordConfirm}
        onCancel={() => {
          if (!changingPassword) setPasswordConfirmOpen(false)
        }}
      />
    </section>
  )
}

export default PasswordCard


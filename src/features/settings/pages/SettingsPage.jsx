import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { changePassword, fetchSettings, updateSettings } from '@/features/settings/api/settings'
import LogoImageField from '@/features/settings/components/LogoImageField'
import SettingsFormSection from '@/features/settings/components/SettingsFormSection'
import LiveBillHeaderPreview from '@/features/settings/components/LiveBillHeaderPreview'
import StickyActionBar from '@/features/settings/components/StickyActionBar'
import PasswordCard from '@/features/settings/components/PasswordCard'
import FormSelect from '@/shared/components/FormSelect'
import NumberInput from '@/shared/components/NumberInput'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  CURRENCY_OPTIONS,
  EMPTY_PASSWORD_FORM,
  EMPTY_SETTINGS_FORM,
  validatePasswordForm,
  validateSettingsForm,
} from '@/features/settings/constants/settings'
import { cn } from '@/shared/utils/cn'
import { useTenant } from '@/shared/tenant/TenantContext'
import { buildWhatsAppUrlFromPhone } from '@/shared/utils/whatsappShare'
import { applyFieldLimit, FIELD_LIMITS } from '@/shared/constants/fieldLimits'

function settingsToForm(data) {
  if (!data) return EMPTY_SETTINGS_FORM
  const phone = data.phone_number ?? ''
  const storedWhatsapp = String(data.whatsapp_url ?? '').trim()
  return {
    company_name: data.company_name ?? '',
    logo_url: data.logo_url ?? '',
    phone_number: phone,
    address: data.address ?? '',
    gst_number: data.gst_number ?? '',
    currency: data.currency ?? 'INR',
    tax_rate: data.tax_rate !== undefined ? String(data.tax_rate) : '0',
    upi_id: data.upi_id ?? '',
    whatsapp_url: storedWhatsapp || buildWhatsAppUrlFromPhone(phone),
    instagram_link: data.instagram_link ?? '',
    facebook_url: data.facebook_url ?? '',
    terms_and_conditions: data.terms_and_conditions ?? '',
    rental_day_calculation_mode: data.rental_day_calculation_mode ?? 'DIFF_2_DAYS',
  }
}

function SettingsPage() {
  const { refreshBranding } = useTenant()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [settingsForm, setSettingsForm] = useState(EMPTY_SETTINGS_FORM)
  const [initialForm, setInitialForm] = useState(EMPTY_SETTINGS_FORM)
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM)

  const [settingsFieldErrors, setSettingsFieldErrors] = useState({})
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const [settingsError, setSettingsError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true)
    setSettingsError(null)

    try {
      const json = await fetchSettings()
      const formatted = settingsToForm(json.data)
      setSettingsForm(formatted)
      setInitialForm(formatted)
    } catch (err) {
      setSettingsError(err.message || 'Failed to load business settings')
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Track whether form has unsaved modifications
  const isDirty = useMemo(() => {
    return JSON.stringify(settingsForm) !== JSON.stringify(initialForm)
  }, [settingsForm, initialForm])

  // Browser navigation warning when unsaved changes exist
  useEffect(() => {
    if (!isDirty) return undefined
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const clearSettingsFieldError = (name) => {
    setSettingsFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const clearPasswordFieldError = (name) => {
    setPasswordFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSettingsChange = (e) => {
    const { name, value } = e.target
    setSettingsForm((prev) => {
      let nextValue = applyFieldLimit(name, value)
      if (name === 'tax_rate' && value !== '') {
        const taxRate = Number(value)
        if (!Number.isNaN(taxRate) && taxRate > 100) {
          nextValue = '100'
        } else if (!Number.isNaN(taxRate) && taxRate < 0) {
          nextValue = '0'
        }
      }
      if (name === 'gst_number') {
        nextValue = value.replace(/[^A-Za-z0-9]/g, '').slice(0, 15).toUpperCase()
      }
      const next = { ...prev, [name]: nextValue }
      if (name === 'phone_number') {
        const previousAuto = buildWhatsAppUrlFromPhone(prev.phone_number)
        const currentWhatsapp = String(prev.whatsapp_url || '').trim()
        if (!currentWhatsapp || currentWhatsapp === previousAuto) {
          next.whatsapp_url = applyFieldLimit(
            'whatsapp_url',
            buildWhatsAppUrlFromPhone(value),
          )
        }
      }
      return next
    })
    clearSettingsFieldError(name)
    if (name === 'phone_number') clearSettingsFieldError('whatsapp_url')
    setSettingsError(null)
  }

  const handleBlur = (fieldName) => {
    const val = String(settingsForm[fieldName] ?? '').trim()
    if (fieldName === 'gst_number' && val) {
      if (!/^[A-Za-z0-9]{15}$/.test(val)) {
        setSettingsFieldErrors((prev) => ({
          ...prev,
          gst_number: 'GST number must be exactly 15 alphanumeric characters',
        }))
      }
    } else if (fieldName === 'phone_number') {
      if (!val) {
        setSettingsFieldErrors((prev) => ({ ...prev, phone_number: 'Phone number is required' }))
      } else if (val.replace(/\D/g, '').length < 10) {
        setSettingsFieldErrors((prev) => ({
          ...prev,
          phone_number: 'Enter a valid phone number (at least 10 digits)',
        }))
      }
    } else if (fieldName === 'company_name' && !val) {
      setSettingsFieldErrors((prev) => ({ ...prev, company_name: 'Company name is required' }))
    } else if (fieldName === 'address' && !val) {
      setSettingsFieldErrors((prev) => ({ ...prev, address: 'Address is required' }))
    } else if (['whatsapp_url', 'instagram_link', 'facebook_url'].includes(fieldName) && val) {
      if (!/^https?:\/\/.+/i.test(val)) {
        setSettingsFieldErrors((prev) => ({
          ...prev,
          [fieldName]: 'URL must start with http:// or https://',
        }))
      }
    }
  }

  const handleDiscard = () => {
    setSettingsForm(initialForm)
    setSettingsFieldErrors({})
    setSettingsError(null)
    toast.info('Unsaved changes discarded')
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
    clearPasswordFieldError(name)
    if (name === 'new_password') clearPasswordFieldError('confirm_new_password')
    setPasswordError(null)
  }

  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setSettingsError(null)

    const errors = validateSettingsForm(settingsForm)
    setSettingsFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setSettingsError('Please fix the highlighted fields and try again.')
      // Scroll first invalid field into view
      const firstErrorField = Object.keys(errors)[0]
      const el = document.getElementById(firstErrorField)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus?.()
      return
    }

    setSavingSettings(true)

    try {
      const phone = settingsForm.phone_number.trim()
      const whatsappUrl =
        settingsForm.whatsapp_url.trim() || buildWhatsAppUrlFromPhone(phone)

      let logoUrl = settingsForm.logo_url?.trim() || ''
      if (logoUrl.startsWith('data:')) {
        logoUrl = ''
        toast.warning('Embedded logo data was cleared. Please re-upload the company logo.')
      }

      const json = await updateSettings({
        ...settingsForm,
        company_name: settingsForm.company_name.trim(),
        logo_url: logoUrl,
        phone_number: phone,
        address: settingsForm.address.trim(),
        gst_number: settingsForm.gst_number.trim().toUpperCase(),
        upi_id: settingsForm.upi_id.trim(),
        whatsapp_url: whatsappUrl,
        instagram_link: settingsForm.instagram_link.trim(),
        facebook_url: settingsForm.facebook_url.trim(),
        terms_and_conditions: settingsForm.terms_and_conditions.trim(),
        rental_day_calculation_mode: settingsForm.rental_day_calculation_mode || 'DIFF_2_DAYS',
        tax_rate: Number(settingsForm.tax_rate) || 0,
      })

      const formatted = settingsToForm(json.data)
      setSettingsForm(formatted)
      setInitialForm(formatted)
      try {
        await refreshBranding()
      } catch {
        // Branding refresh is non-blocking
      }
      toast.success(json.message || 'Settings saved successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to update settings')
      setSettingsError(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPasswordError(null)

    const errors = validatePasswordForm(passwordForm)
    setPasswordFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setPasswordError('Please fix the highlighted fields and try again.')
      return
    }

    setPasswordConfirmOpen(true)
  }

  const handleChangePasswordConfirm = async () => {
    setChangingPassword(true)

    try {
      await changePassword(passwordForm)
      setPasswordForm(EMPTY_PASSWORD_FORM)
      setPasswordConfirmOpen(false)
      await logout()
      navigate('/login', {
        replace: true,
        state: {
          notice: 'Password changed successfully. Please log in with your new password.',
        },
      })
    } catch (err) {
      toast.error(err.message)
      setPasswordError(err.message)
      setPasswordConfirmOpen(false)
    } finally {
      setChangingPassword(false)
    }
  }

  // Skeleton loading state
  if (loadingSettings) {
    return (
      <div className="flex flex-col gap-5 max-w-[1100px] animate-fade-up">
        <div className="page-header">
          <div className="page-header-copy">
            <p className="page-kicker">Business</p>
            <h1 className="page-title">Company Profile</h1>
            <p className="page-lead">Update shop details, tax, and social links.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-6">
          <div className="h-6 w-48 rounded-lg bg-surface-muted animate-pulse" />
          <div className="h-28 w-28 rounded-2xl bg-surface-muted animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-12 rounded-xl bg-surface-muted animate-pulse" />
            <div className="h-12 rounded-xl bg-surface-muted animate-pulse" />
            <div className="h-24 sm:col-span-2 rounded-xl bg-surface-muted animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // Error fallback state with Retry
  if (settingsError && !savingSettings && !settingsForm.company_name) {
    return (
      <div className="flex flex-col gap-5 max-w-[800px] animate-fade-up py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 sm:p-8 text-center flex flex-col items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          </span>
          <h2 className="m-0 font-display text-lg font-bold text-rose-900">
            Failed to load settings
          </h2>
          <p className="m-0 text-sm text-rose-700 max-w-md">
            {settingsError}
          </p>
          <button
            type="button"
            className="btn-primary mt-2 px-5 py-2.5 text-xs font-semibold rounded-xl"
            onClick={loadSettings}
          >
            <i className="fa-solid fa-rotate-right mr-1.5" aria-hidden="true" />
            Retry Loading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1280px] animate-fade-up pb-16 lg:pb-8">
      {/* 1. Page Header Card */}
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">BUSINESS</p>
          <h1 className="page-title">Company Profile</h1>
          <p className="page-lead">Update shop details, tax, and social links.</p>
        </div>

        {/* Live dirty status pill */}
        {isDirty && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 animate-soft-in">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Unsaved Changes</span>
          </div>
        )}
      </div>

      {/* Main Grid: Settings Form on Left, Live Bill Preview on Right (1280px+) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          {/* 2. Company Profile Card */}
          <form
            className="rounded-2xl border border-border bg-surface p-4 sm:p-7 shadow-sm flex flex-col gap-6"
            onSubmit={handleSaveSettings}
            noValidate
          >
            {/* Section A: Company Information */}
            <SettingsFormSection
              title="Company Information"
              description="Basic profile, legal name, and primary business address."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Logo uploader */}
                <LogoImageField
                  value={settingsForm.logo_url}
                  onChange={(logo_url) => {
                    setSettingsForm((prev) => ({ ...prev, logo_url }))
                    setSettingsError(null)
                  }}
                />

                {/* Company Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="company_name" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Company Name <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <input
                    id="company_name"
                    name="company_name"
                    value={settingsForm.company_name}
                    onChange={handleSettingsChange}
                    onBlur={() => handleBlur('company_name')}
                    maxLength={FIELD_LIMITS.company_name}
                    placeholder="e.g. Maruti Selection"
                    aria-invalid={Boolean(settingsFieldErrors.company_name)}
                    aria-describedby={settingsFieldErrors.company_name ? 'company_name-err' : undefined}
                    className={cn(
                      'h-11 sm:h-12 w-full rounded-xl border bg-white px-3.5 text-sm text-text transition-all duration-160',
                      'placeholder:text-text-muted/60 placeholder:italic',
                      'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                      settingsFieldErrors.company_name ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                    )}
                  />
                  {settingsFieldErrors.company_name && (
                    <p id="company_name-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.company_name}</span>
                    </p>
                  )}
                </div>

                {/* Phone Number with +91 chip */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone_number" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Phone Number <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="flex h-11 sm:h-12 items-center justify-center rounded-l-xl border border-r-0 border-border bg-surface-muted px-3 text-xs font-bold text-text-secondary select-none shrink-0">
                      +91
                    </div>
                    <input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      inputMode="tel"
                      value={settingsForm.phone_number}
                      onChange={handleSettingsChange}
                      onBlur={() => handleBlur('phone_number')}
                      placeholder="9876543210"
                      aria-invalid={Boolean(settingsFieldErrors.phone_number)}
                      aria-describedby={settingsFieldErrors.phone_number ? 'phone_number-err' : undefined}
                      className={cn(
                        'h-11 sm:h-12 w-full rounded-r-xl border bg-white px-3.5 text-sm text-text transition-all duration-160',
                        'placeholder:text-text-muted/60 placeholder:italic',
                        'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                        settingsFieldErrors.phone_number ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                      )}
                    />
                  </div>
                  {settingsFieldErrors.phone_number && (
                    <p id="phone_number-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.phone_number}</span>
                    </p>
                  )}
                </div>

                {/* Address full width */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="address" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Shop Address <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    value={settingsForm.address}
                    onChange={handleSettingsChange}
                    onBlur={() => handleBlur('address')}
                    maxLength={FIELD_LIMITS.address}
                    placeholder="Enter complete store address, landmark, city, and pincode..."
                    aria-invalid={Boolean(settingsFieldErrors.address)}
                    aria-describedby={settingsFieldErrors.address ? 'address-err' : undefined}
                    className={cn(
                      'min-h-[5rem] w-full rounded-xl border bg-white p-3 text-sm text-text transition-all duration-160 resize-y',
                      'placeholder:text-text-muted/60 placeholder:italic',
                      'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                      settingsFieldErrors.address ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                    )}
                  />
                  {settingsFieldErrors.address && (
                    <p id="address-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.address}</span>
                    </p>
                  )}
                </div>

                {/* GST Number */}
                <div className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-md">
                  <label htmlFor="gst_number" className="text-[0.82rem] font-semibold text-text-secondary select-none flex items-center justify-between">
                    <span>GST Number (GSTIN)</span>
                    <span className="text-[0.7rem] text-text-muted font-normal">Optional</span>
                  </label>
                  <input
                    id="gst_number"
                    name="gst_number"
                    value={settingsForm.gst_number}
                    onChange={handleSettingsChange}
                    onBlur={() => handleBlur('gst_number')}
                    maxLength={15}
                    autoComplete="off"
                    placeholder="22AAAAA0000A1Z5"
                    aria-invalid={Boolean(settingsFieldErrors.gst_number)}
                    aria-describedby={settingsFieldErrors.gst_number ? 'gst_number-err' : undefined}
                    className={cn(
                      'h-11 sm:h-12 w-full rounded-xl border bg-white px-3.5 text-sm uppercase font-mono text-text transition-all duration-160',
                      'placeholder:text-text-muted/60 placeholder:italic placeholder:font-sans placeholder:normal-case',
                      'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                      settingsFieldErrors.gst_number ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                    )}
                  />
                  {settingsFieldErrors.gst_number && (
                    <p id="gst_number-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.gst_number}</span>
                    </p>
                  )}
                </div>
              </div>
            </SettingsFormSection>

            {/* Section B: Business Settings */}
            <SettingsFormSection
              title="Business Settings"
              description="Billing currency and standard sales/rental tax rate."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Currency */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="currency" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Currency <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <FormSelect
                    id="currency"
                    name="currency"
                    value={settingsForm.currency}
                    onChange={handleSettingsChange}
                    aria-invalid={Boolean(settingsFieldErrors.currency)}
                    options={CURRENCY_OPTIONS}
                    clearable={false}
                  />
                  {settingsFieldErrors.currency && (
                    <p className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.currency}</span>
                    </p>
                  )}
                </div>

                {/* Tax Rate with % chip */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tax_rate" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Tax Rate (%) <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <NumberInput
                      id="tax_rate"
                      name="tax_rate"
                      min="0"
                      max="100"
                      value={settingsForm.tax_rate}
                      onChange={handleSettingsChange}
                      onBlur={() => handleBlur('tax_rate')}
                      aria-invalid={Boolean(settingsFieldErrors.tax_rate)}
                      className={cn(
                        'h-11 sm:h-12 w-full rounded-xl border bg-white pl-3.5 pr-10 text-sm text-text transition-all duration-160',
                        'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                        settingsFieldErrors.tax_rate ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                      )}
                    />
                    <div className="absolute right-3.5 flex items-center justify-center text-xs font-bold text-text-muted pointer-events-none select-none">
                      %
                    </div>
                  </div>
                  <p className="m-0 text-[0.75rem] text-text-secondary">
                    Enter 0 if you do not want to apply tax.
                  </p>
                  {settingsFieldErrors.tax_rate && (
                    <p className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.tax_rate}</span>
                    </p>
                  )}
                </div>
              </div>
            </SettingsFormSection>

            {/* Section C: QR Code Links / Social Media */}
            <SettingsFormSection
              title="QR Code Links & Social Media"
              description="Customer payment QR info and direct social channels."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* UPI ID */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="upi_id" className="text-[0.82rem] font-semibold text-text-secondary select-none flex items-center justify-between">
                    <span>Merchant UPI ID (for In-Bill QR)</span>
                    <span className="text-[0.7rem] text-text-muted font-normal">Optional</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center justify-center text-text-muted pointer-events-none">
                      <i className="fa-solid fa-qrcode text-sm text-amber-600" aria-hidden="true" />
                    </div>
                    <input
                      id="upi_id"
                      name="upi_id"
                      value={settingsForm.upi_id}
                      onChange={handleSettingsChange}
                      placeholder="merchant@oksbi"
                      className="h-11 sm:h-12 w-full rounded-xl border border-border bg-white pl-10 pr-3.5 text-sm text-text transition-all duration-160 placeholder:text-text-muted/60 placeholder:italic focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 hover:border-border-strong"
                    />
                  </div>
                  <p className="m-0 text-[0.75rem] text-text-muted">
                    Generates dynamic scannable payment QR code on customer bills.
                  </p>
                </div>

                {/* WhatsApp Contact URL */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="whatsapp_url" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    WhatsApp Contact URL
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center justify-center text-emerald-600 pointer-events-none">
                      <i className="fa-brands fa-whatsapp text-base" aria-hidden="true" />
                    </div>
                    <input
                      id="whatsapp_url"
                      name="whatsapp_url"
                      value={settingsForm.whatsapp_url}
                      onChange={handleSettingsChange}
                      onBlur={() => handleBlur('whatsapp_url')}
                      maxLength={FIELD_LIMITS.whatsapp_url}
                      placeholder="https://wa.me/919876543210"
                      aria-invalid={Boolean(settingsFieldErrors.whatsapp_url)}
                      aria-describedby={settingsFieldErrors.whatsapp_url ? 'whatsapp_url-err' : undefined}
                      className={cn(
                        'h-11 sm:h-12 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-text transition-all duration-160',
                        'placeholder:text-text-muted/60 placeholder:italic',
                        'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                        settingsFieldErrors.whatsapp_url ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[0.72rem] text-text-muted">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <i className="fa-solid fa-bolt text-xs" /> Auto-filled from phone
                    </span>
                    <button
                      type="button"
                      className="text-accent hover:underline font-semibold cursor-pointer"
                      onClick={() => {
                        setSettingsForm((prev) => ({
                          ...prev,
                          whatsapp_url: buildWhatsAppUrlFromPhone(prev.phone_number),
                        }))
                        clearSettingsFieldError('whatsapp_url')
                      }}
                    >
                      Reset to Phone
                    </button>
                  </div>
                  {settingsFieldErrors.whatsapp_url && (
                    <p id="whatsapp_url-err" className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.whatsapp_url}</span>
                    </p>
                  )}
                </div>

                {/* Instagram Link */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="instagram_link" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Instagram Profile Link
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center justify-center text-pink-600 pointer-events-none">
                      <i className="fa-brands fa-instagram text-base" aria-hidden="true" />
                    </div>
                    <input
                      id="instagram_link"
                      name="instagram_link"
                      value={settingsForm.instagram_link}
                      onChange={handleSettingsChange}
                      onBlur={() => handleBlur('instagram_link')}
                      maxLength={FIELD_LIMITS.instagram_link}
                      placeholder="https://instagram.com/yourshop"
                      aria-invalid={Boolean(settingsFieldErrors.instagram_link)}
                      className={cn(
                        'h-11 sm:h-12 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-text transition-all duration-160',
                        'placeholder:text-text-muted/60 placeholder:italic',
                        'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                        settingsFieldErrors.instagram_link ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                      )}
                    />
                  </div>
                  {settingsFieldErrors.instagram_link && (
                    <p className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.instagram_link}</span>
                    </p>
                  )}
                </div>

                {/* Facebook URL */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="facebook_url" className="text-[0.82rem] font-semibold text-text-secondary select-none">
                    Facebook Page URL
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center justify-center text-blue-600 pointer-events-none">
                      <i className="fa-brands fa-facebook text-base" aria-hidden="true" />
                    </div>
                    <input
                      id="facebook_url"
                      name="facebook_url"
                      value={settingsForm.facebook_url}
                      onChange={handleSettingsChange}
                      onBlur={() => handleBlur('facebook_url')}
                      maxLength={FIELD_LIMITS.facebook_url}
                      placeholder="https://facebook.com/yourshop"
                      aria-invalid={Boolean(settingsFieldErrors.facebook_url)}
                      className={cn(
                        'h-11 sm:h-12 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-text transition-all duration-160',
                        'placeholder:text-text-muted/60 placeholder:italic',
                        'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                        settingsFieldErrors.facebook_url ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                      )}
                    />
                  </div>
                  {settingsFieldErrors.facebook_url && (
                    <p className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                      <span>{settingsFieldErrors.facebook_url}</span>
                    </p>
                  )}
                </div>
              </div>
            </SettingsFormSection>

            {/* Section D: Terms & Conditions */}
            <SettingsFormSection
              title="Terms & Conditions"
              description="Rental policies, security deposit conditions, and return rules printed on invoices."
            >
              <div className="flex flex-col gap-1.5">
                <textarea
                  id="terms_and_conditions"
                  name="terms_and_conditions"
                  rows={4}
                  value={settingsForm.terms_and_conditions}
                  onChange={handleSettingsChange}
                  maxLength={FIELD_LIMITS.terms_and_conditions}
                  placeholder="Enter shop rental terms, e.g. Customer is responsible for damage during hire period..."
                  aria-invalid={Boolean(settingsFieldErrors.terms_and_conditions)}
                  className={cn(
                    'min-h-[5.5rem] w-full rounded-xl border bg-white p-3.5 text-sm text-text transition-all duration-160 resize-y',
                    'placeholder:text-text-muted/60 placeholder:italic',
                    'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25',
                    settingsFieldErrors.terms_and_conditions ? 'border-rose-500 bg-rose-50/20' : 'border-border hover:border-border-strong',
                  )}
                />
                <div className="flex items-center justify-between text-xs text-text-muted mt-0.5">
                  <span>Included at the footer of invoice receipts.</span>
                  <span
                    className={cn(
                      'font-mono text-[0.72rem]',
                      settingsForm.terms_and_conditions.length >= FIELD_LIMITS.terms_and_conditions
                        ? 'text-danger font-bold'
                        : 'text-text-muted',
                    )}
                  >
                    {settingsForm.terms_and_conditions.length} / {FIELD_LIMITS.terms_and_conditions}
                  </span>
                </div>
                {settingsFieldErrors.terms_and_conditions && (
                  <p className="m-0 text-[0.78rem] text-rose-600 font-medium flex items-center gap-1">
                    <i className="fa-solid fa-circle-exclamation text-xs" aria-hidden="true" />
                    <span>{settingsFieldErrors.terms_and_conditions}</span>
                  </p>
                )}
              </div>
            </SettingsFormSection>

            {settingsError && (
              <p className="m-0 text-[0.82rem] text-rose-600 font-semibold flex items-center gap-1.5 p-3 rounded-xl bg-rose-50 border border-rose-200">
                <i className="fa-solid fa-circle-exclamation text-sm" aria-hidden="true" />
                <span>{settingsError}</span>
              </p>
            )}

            {/* In-Card Save & Discard Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
              {isDirty && (
                <button
                  type="button"
                  className="btn-secondary h-11 px-4 text-sm rounded-xl"
                  onClick={handleDiscard}
                  disabled={savingSettings}
                >
                  Discard
                </button>
              )}

              <button
                type="submit"
                className="btn-primary h-11 px-6 text-sm rounded-xl"
                disabled={savingSettings || !isDirty}
                title={!isDirty ? 'No changes to save' : 'Save all settings'}
              >
                {savingSettings ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" aria-hidden="true" />
                    <span>Saving Settings…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk text-xs" aria-hidden="true" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 3. Change Password Card (Separate Card) */}
          <PasswordCard
            passwordForm={passwordForm}
            passwordFieldErrors={passwordFieldErrors}
            passwordError={passwordError}
            changingPassword={changingPassword}
            passwordConfirmOpen={passwordConfirmOpen}
            setPasswordConfirmOpen={setPasswordConfirmOpen}
            onPasswordChange={handlePasswordChange}
            onPasswordSubmit={handlePasswordSubmit}
            onPasswordConfirm={handleChangePasswordConfirm}
          />
        </div>

        {/* 4. Live Bill Header Preview Card (Desktop / Large Viewports) */}
        <aside className="hidden lg:block sticky top-6">
          <LiveBillHeaderPreview form={settingsForm} />
        </aside>
      </div>

      {/* Sticky Action Bar on Mobile / Tablet when dirty */}
      <StickyActionBar
        isDirty={isDirty}
        saving={savingSettings}
        onSave={handleSaveSettings}
        onDiscard={handleDiscard}
      />
    </div>
  )
}

export default SettingsPage

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { createShop, getShop, updateShop, uploadShopLogo } from '@/features/admin/shops/api'
import LogoImageField from '@/features/admin/shops/LogoImageField'
import FormSelect from '@/shared/components/AdminFormSelect'
import { isInlineAssetUrl } from '@/shared/utils/assetUrl'
import { FormErrorAlert } from '@/shared/components/FormErrorAlert'
import { handleFormApiError } from '@/shared/utils/formErrors'

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

const BUSINESS_TYPE_OPTIONS = [
  { value: 'SALES_AND_RENTAL', label: 'Both Rental & Sales (Full Suite)' },
  { value: 'RENTAL', label: 'Rental Only' },
  { value: 'SALES', label: 'Sales Only' },
]

const PHONE_REGEX = /^\d{10}$/

function validatePhoneNumber(value) {
  const phone = String(value || '').trim()
  if (!phone) return 'Phone number is required'
  if (!PHONE_REGEX.test(phone)) return 'Phone number must be exactly 10 digits'
  return null
}

const EMPTY_FORM = {
  slug: '',
  name: '',
  business_type: 'SALES_AND_RENTAL',
  max_products: '',
  max_bookings: '',
  max_sales: '',
  company_name: '',
  page_title: '',
  phone_number: '',
  address: '',
  currency: 'INR',
  logo_url: '',
  owner_email: '',
  owner_full_name: '',
  owner_password: '',
  status: 'active',
}

export default function ShopFormPage() {
  const { slug } = useParams()
  const isEdit = Boolean(slug)
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [originalBusinessType, setOriginalBusinessType] = useState('SALES_AND_RENTAL')
  const [showPassword, setShowPassword] = useState(false)
  const [pendingLogoFile, setPendingLogoFile] = useState(null)
  const [manualCompany, setManualCompany] = useState(false)
  const [manualPageTitle, setManualPageTitle] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!isEdit) {
      setForm(EMPTY_FORM)
      setPendingLogoFile(null)
      setManualCompany(false)
      setManualPageTitle(false)
      setLoading(false)
      setSubmitting(false)
      setError(null)
      return undefined
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const shop = await getShop(slug)
        if (cancelled) return
        const name = shop.name || ''
        const companyName = shop.company_name || ''
        const pageTitle = shop.page_title || ''
        const initialBusinessType = shop.business_type || shop.businessType || 'SALES_AND_RENTAL'
        setOriginalBusinessType(initialBusinessType)
        setForm({
          slug: shop.slug || '',
          name,
          business_type: initialBusinessType,
          max_products: shop.max_products !== null && shop.max_products !== undefined ? String(shop.max_products) : '',
          max_bookings: shop.max_bookings !== null && shop.max_bookings !== undefined ? String(shop.max_bookings) : '',
          max_sales: shop.max_sales !== null && shop.max_sales !== undefined ? String(shop.max_sales) : '',
          company_name: companyName,
          page_title: pageTitle,
          phone_number: String(shop.phone_number || '')
            .replace(/\D/g, '')
            .slice(0, 10),
          address: shop.address || '',
          currency: CURRENCY_OPTIONS.some((opt) => opt.value === shop.currency)
            ? shop.currency
            : 'INR',
          logo_url: shop.logo_url || '',
          owner_email: shop.owner?.email || '',
          owner_full_name: shop.owner?.full_name || '',
          owner_password: '',
          status: shop.status === 'deleted' ? 'active' : shop.status || 'active',
        })
        setPendingLogoFile(null)
        setManualCompany(Boolean(companyName && companyName !== name))
        setManualPageTitle(Boolean(pageTitle && pageTitle !== name))
      } catch (err) {
        if (!cancelled && !err?.silent) {
          setError(err.message)
          toast.error(err.message || 'Failed to load shop')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isEdit, slug])

  const onChange = (field) => (e) => {
    let value = e.target.value
    if (field === 'phone_number') {
      value = value.replace(/\D/g, '').slice(0, 10)
    }
    setForm((prev) => {
      if (field === 'name') {
        return {
          ...prev,
          name: value,
          company_name: manualCompany ? prev.company_name : value.slice(0, 100),
          page_title: manualPageTitle ? prev.page_title : value,
        }
      }
      return { ...prev, [field]: value }
    })
  }

  const onCompanyChange = (e) => {
    setManualCompany(true)
    setForm((prev) => ({ ...prev, company_name: e.target.value }))
  }

  const onPageTitleChange = (e) => {
    setManualPageTitle(true)
    setForm((prev) => ({ ...prev, page_title: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const phone = form.phone_number.trim()
    const phoneError = validatePhoneNumber(phone)
    if (phoneError) {
      setError(phoneError)
      toast.error(phoneError)
      setSubmitting(false)
      return
    }

    const storedLogoUrl = isInlineAssetUrl(form.logo_url) ? '' : form.logo_url.trim()

    const parseLimit = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, parseInt(v, 10) || 0))

    try {
      if (isEdit) {
        const payload = {
          name: form.name.trim(),
          business_type: form.business_type,
          businessType: form.business_type,
          max_products: parseLimit(form.max_products),
          max_bookings: parseLimit(form.max_bookings),
          max_sales: parseLimit(form.max_sales),
          company_name: form.company_name.trim() || form.name.trim(),
          page_title: form.page_title.trim() || form.company_name.trim() || form.name.trim(),
          phone_number: phone,
          address: form.address,
          currency: form.currency.trim() || 'INR',
          logo_url: storedLogoUrl,
          owner_full_name: form.owner_full_name.trim(),
        }
        if (form.owner_password) payload.owner_password = form.owner_password
        await updateShop(slug, payload)
        toast.success(`Updated shop "${form.slug || slug}"`)
      } else {
        const nextSlug = form.slug.trim().toLowerCase()
        await createShop({
          slug: nextSlug,
          name: form.name.trim(),
          business_type: form.business_type,
          businessType: form.business_type,
          max_products: parseLimit(form.max_products),
          max_bookings: parseLimit(form.max_bookings),
          max_sales: parseLimit(form.max_sales),
          company_name: form.company_name.trim() || form.name.trim(),
          page_title: form.page_title.trim() || form.company_name.trim() || form.name.trim(),
          phone_number: phone,
          address: form.address,
          currency: form.currency.trim() || 'INR',
          logo_url: storedLogoUrl,
          owner_email: form.owner_email.trim(),
          owner_full_name: form.owner_full_name.trim(),
          owner_password: form.owner_password,
        })
        if (pendingLogoFile) {
          try {
            const uploaded = await uploadShopLogo(
              nextSlug,
              pendingLogoFile,
              pendingLogoFile.name || 'logo.jpg',
            )
            await updateShop(nextSlug, { logo_url: uploaded.url })
          } catch (logoErr) {
            toast.success(`Created shop "${nextSlug}"`)
            toast.error(
              logoErr.message || 'Shop created, but logo upload failed. Edit the shop to retry.',
            )
            navigate(`/admin/shops/${nextSlug}/edit`)
            return
          }
        }
        toast.success(`Created shop "${nextSlug}"`)
      }
      navigate('/admin/shops')
    } catch (err) {
      if (err?.silent) return
      handleFormApiError(err, {
        setFieldErrors,
        setFormError: setError,
        fieldIds: {
          slug: 'shop_slug',
          owner_email: 'owner_email',
          name: 'shop_name',
          phone_number: 'phone_number',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-muted">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        Loading shop…
      </p>
    )
  }

  const fieldClass =
    'rounded-xl border border-border bg-light px-3 py-2.5 outline-none focus:border-accent'
  const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-ink-soft'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 flex items-center gap-2.5 font-display text-[2.15rem] font-semibold tracking-[-0.03em] text-ink">
            {isEdit ? 'Edit Shop' : 'Add Shop'}
          </h2>
          <p className="mt-1 mb-0 text-muted">
            {isEdit
              ? 'Update shop branding, contact details, and owner account.'
              : 'Provision a new client shop with an owner login.'}
          </p>
        </div>
        <Link
          to="/admin/shops"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-accent-hover"
        >
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to shops
        </Link>
      </div>

      <FormErrorAlert message={error} onDismiss={() => setError(null)} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <section className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
          <h3 className="m-0 inline-flex items-center gap-2 min-[640px]:col-span-2 text-base font-semibold text-ink">
            <i className="fa-solid fa-store text-muted" aria-hidden="true" />
            Shop details
          </h3>
          <label className={labelClass}>
            Shop name *
            <input className={fieldClass} value={form.name} onChange={onChange('name')} required />
          </label>
          <label className={labelClass}>
            URL slug *
            <input
              id="shop_slug"
              className={`${fieldClass} ${fieldErrors.slug ? 'border-danger focus:border-danger' : ''}`}
              value={form.slug}
              onChange={(e) => {
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  delete next.slug
                  return next
                })
                onChange('slug')(e)
              }}
              required={!isEdit}
              disabled={isEdit}
              placeholder="acme-rentals"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              aria-invalid={Boolean(fieldErrors.slug)}
              aria-describedby={fieldErrors.slug ? 'shop_slug-error' : undefined}
            />
            {fieldErrors.slug && (
              <p id="shop_slug-error" className="m-0 text-xs font-medium text-danger">
                {fieldErrors.slug}
              </p>
            )}
          </label>
          <label className={labelClass}>
            Company name
            <input
              className={fieldClass}
              value={form.company_name}
              onChange={onCompanyChange}
              maxLength={100}
            />
          </label>
          <label className={labelClass}>
            Page title
            <input className={fieldClass} value={form.page_title} onChange={onPageTitleChange} />
          </label>
          <label className={labelClass}>
            Phone *
            <input
              className={fieldClass}
              type="tel"
              inputMode="numeric"
              value={form.phone_number}
              onChange={onChange('phone_number')}
              required
              pattern="\d{10}"
              maxLength={10}
              title="Enter a 10-digit phone number"
              placeholder="9876543210"
            />
          </label>
          <label className={labelClass}>
            Currency
            <FormSelect
              name="currency"
              value={form.currency}
              onChange={onChange('currency')}
              options={CURRENCY_OPTIONS}
            />
          </label>
          <label className={`${labelClass} min-[640px]:col-span-2`}>
            Address
            <textarea
              className={fieldClass}
              rows={2}
              value={form.address}
              onChange={onChange('address')}
              maxLength={200}
            />
          </label>

          <LogoImageField
            value={form.logo_url}
            slug={isEdit ? slug : ''}
            onChange={(logo_url) => setForm((prev) => ({ ...prev, logo_url }))}
            onPendingFile={setPendingLogoFile}
          />
        </section>

        <hr className="border-border" />

        {/* Business Purpose & Model */}
        <section className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
          <div className="min-[640px]:col-span-2">
            <h3 className="m-0 inline-flex items-center gap-2 text-base font-semibold text-ink">
              <i className="fa-solid fa-briefcase text-muted" aria-hidden="true" />
              Shop Purpose & Business Model
            </h3>
            <p className="mt-1 mb-0 text-xs text-muted">
              Select whether this shop operates as Rental only, Direct Sales only, or both.
            </p>
          </div>

          <label className={`${labelClass} min-[640px]:col-span-2`}>
            Shop Purpose *
            <FormSelect
              name="business_type"
              value={form.business_type}
              onChange={onChange('business_type')}
              options={BUSINESS_TYPE_OPTIONS}
              disabled={isEdit && originalBusinessType === 'SALES_AND_RENTAL'}
            />
            {isEdit && originalBusinessType === 'SALES_AND_RENTAL' && (
              <span className="text-xs text-muted flex items-center gap-1.5 mt-1">
                <i className="fa-solid fa-lock text-[0.7rem] text-accent" />
                This shop is configured for both Rental and Sales. It cannot be downgraded to a single business type.
              </span>
            )}
            {isEdit && originalBusinessType === 'SALES' && form.business_type === 'RENTAL' && (
              <span className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-1 flex items-start gap-1.5">
                <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                <span>Notice: Switching from Sales to Rental will only be allowed if this shop currently has <strong>0 sales products</strong> and <strong>0 sales transactions</strong>.</span>
              </span>
            )}
            {isEdit && originalBusinessType === 'RENTAL' && form.business_type === 'SALES' && (
              <span className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-1 flex items-start gap-1.5">
                <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                <span>Notice: Switching from Rental to Sales will only be allowed if this shop currently has <strong>0 rental products</strong> and <strong>0 rental bookings</strong>.</span>
              </span>
            )}
          </label>
        </section>

        <hr className="border-border" />

        {/* Usage Limits & Quotas */}
        <section className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-3">
          <div className="min-[640px]:col-span-3">
            <h3 className="m-0 inline-flex items-center gap-2 text-base font-semibold text-ink">
              <i className="fa-solid fa-gauge text-muted" aria-hidden="true" />
              Usage Limits & Plan Quotas
            </h3>
            <p className="mt-1 mb-0 text-xs text-muted">
              Configure maximum allowable items. Leave empty for unlimited.
            </p>
          </div>

          <label className={labelClass}>
            <span>Max Products</span>
            <input
              type="number"
              min="0"
              step="1"
              className={fieldClass}
              value={form.max_products}
              onChange={onChange('max_products')}
              placeholder="Unlimited"
            />
            <span className="text-[0.72rem] text-muted">Catalog items ceiling</span>
          </label>

          <label className={labelClass}>
            <span>Max Bookings</span>
            <input
              type="number"
              min="0"
              step="1"
              className={fieldClass}
              value={form.max_bookings}
              onChange={onChange('max_bookings')}
              placeholder="Unlimited"
            />
            <span className="text-[0.72rem] text-muted">Rental bookings ceiling</span>
          </label>

          <label className={labelClass}>
            <span>Max Sales</span>
            <input
              type="number"
              min="0"
              step="1"
              className={fieldClass}
              value={form.max_sales}
              onChange={onChange('max_sales')}
              placeholder="Unlimited"
            />
            <span className="text-[0.72rem] text-muted">Direct sales orders ceiling</span>
          </label>
        </section>

        <hr className="border-border" />

        <section className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
          <h3 className="m-0 inline-flex items-center gap-2 min-[640px]:col-span-2 text-base font-semibold text-ink">
            <i className="fa-solid fa-user-shield text-muted" aria-hidden="true" />
            Owner account
          </h3>
          <label className={labelClass}>
            <div className="flex items-center justify-between">
              <span>Owner email *</span>
              {isEdit && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2 py-0.5 text-[0.7rem] font-medium text-muted">
                  <i className="fa-solid fa-lock text-[0.6rem]" aria-hidden="true" />
                  Immutable
                </span>
              )}
            </div>
            <input
              id="owner_email"
              type="email"
              className={`${fieldClass} ${fieldErrors.owner_email ? 'border-danger focus:border-danger' : ''} ${isEdit ? 'cursor-not-allowed bg-surface-muted opacity-80 text-muted border-border/70' : ''}`}
              value={form.owner_email}
              onChange={(e) => {
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  delete next.owner_email
                  return next
                })
                onChange('owner_email')(e)
              }}
              disabled={isEdit}
              readOnly={isEdit}
              title={isEdit ? 'Shop registered email address is immutable and cannot be changed after creation' : ''}
              required
              aria-invalid={Boolean(fieldErrors.owner_email)}
              aria-describedby={fieldErrors.owner_email ? 'owner_email-error' : undefined}
            />
            {fieldErrors.owner_email && (
              <p id="owner_email-error" className="mt-1 mb-0 text-xs font-medium text-danger">
                {fieldErrors.owner_email}
              </p>
            )}
            {isEdit && (
              <p className="mt-1 mb-0 text-[0.75rem] text-muted">
                The registered owner email cannot be modified after shop creation for security & audit consistency.
              </p>
            )}
          </label>
          <label className={labelClass}>
            Owner full name
            <input
              className={fieldClass}
              value={form.owner_full_name}
              onChange={onChange('owner_full_name')}
            />
          </label>
          <label className={labelClass}>
            {isEdit ? 'New password (optional)' : 'Owner password *'}
            <div className="relative flex items-center w-full">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${fieldClass} w-full pr-11`}
                value={form.owner_password}
                onChange={onChange('owner_password')}
                required={!isEdit}
                minLength={6}
                autoComplete="new-password"
                placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Minimum 6 characters'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 text-muted transition-colors hover:text-ink focus:text-accent focus:outline-none"
              >
                <i
                  className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}
                  aria-hidden="true"
                />
              </button>
            </div>
          </label>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {submitting ? (
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            ) : (
              <i className={`fa-solid ${isEdit ? 'fa-floppy-disk' : 'fa-plus'}`} aria-hidden="true" />
            )}
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create shop'}
          </button>
          <Link
            to="/admin/shops"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold text-ink no-underline hover:bg-canvas"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
            Cancel
          </Link>
        </div>

        {!isEdit && (
          <p className="m-0 inline-flex items-start gap-2 text-xs text-muted">
            <i className="fa-solid fa-link mt-0.5" aria-hidden="true" />
            <span>
              After create, shop users can sign in at{' '}
              <code>/login</code> with their email and password.
            </span>
          </p>
        )}
      </form>
    </div>
  )
}

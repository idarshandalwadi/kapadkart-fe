import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createProduct,
  fetchProductById,
  updateProduct,
} from '@/features/products/api/products'
import {
  availabilityFlagsFromType,
  EMPTY_PRODUCT_FORM,
  GENDER_OPTIONS,
  getTenantAvailabilityDefaults,
} from '@/features/products/constants/products'
import ProductImageField from '@/features/products/components/ProductImageField'
import {
  parseProductImages,
  serializeProductImages,
} from '@/features/products/utils/productImages'
import {
  createBrand,
  createCategory,
  fetchBrands,
  fetchCategories,
} from '@/features/settings/api/catalog'
import { fetchSettings } from '@/features/settings/api/settings'
import CatalogCreateDialog from '@/features/settings/components/CatalogCreateDialog'
import FormSelect from '@/shared/components/FormSelect'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useTenant } from '@/shared/tenant/TenantContext'
import NumberInput from '@/shared/components/NumberInput'
import { cn } from '@/shared/utils/cn'
import { revealFormErrors, handleFormApiError } from '@/shared/utils/formErrors'
import { UsageLimitModal } from '@/shared/components/UsageLimitModal'
import { FormErrorAlert } from '@/shared/components/FormErrorAlert'
import {
  FIELD_LIMITS,
  applyFieldLimit,
  maxLengthMessage,
} from '@/shared/constants/fieldLimits'

function productToForm(product) {
  const flags = availabilityFlagsFromType(product.availability_type ?? 'rent')
  return {
    product_name: product.product_name ?? '',
    product_code: product.product_code ?? '',
    size: product.size ?? '',
    images: parseProductImages(product.image),
    category: product.category ?? '',
    brand: product.brand ?? '',
    gender: product.gender ?? '',
    color: product.color ?? '',
    purchase_price:
      product.purchase_price != null ? String(product.purchase_price) : '0',
    daily_rent: product.daily_rent != null ? String(product.daily_rent) : '0',
    sale_price: product.sale_price != null ? String(product.sale_price) : '0',
    total_quantity:
      product.total_quantity != null
        ? String(product.total_quantity)
        : product.quantity != null
          ? String(product.quantity)
          : '1',
    damaged_quantity:
      product.damaged_quantity != null ? String(product.damaged_quantity) : '0',
    for_rental: flags.for_rental,
    for_sale: flags.for_sale,
    description: product.description ?? '',
    status: product.status ?? 'Available',
  }
}

function ProductFormPage() {
  const { path } = useTenant()
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const [tenantBusinessType, setTenantBusinessType] = useState(
    () => user?.tenant?.businessType || user?.tenant?.business_type || 'SALES_AND_RENTAL'
  )
  const [showAdvanced, setShowAdvanced] = useState(isEdit)
  const [form, setForm] = useState(() => {
    const defaults = getTenantAvailabilityDefaults(
      user?.tenant?.businessType || user?.tenant?.business_type || 'SALES_AND_RENTAL',
    )
    return {
      ...EMPTY_PRODUCT_FORM,
      for_rental: defaults.for_rental,
      for_sale: defaults.for_sale,
    }
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [usageLimitData, setUsageLimitData] = useState(null)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [brandOptions, setBrandOptions] = useState([])
  const [catalogDialog, setCatalogDialog] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      try {
        const [categories, brands, settings] = await Promise.all([
          fetchCategories(),
          fetchBrands(),
          fetchSettings().catch(() => null),
        ])
        if (cancelled) return
        setCategoryOptions((categories ?? []).map((item) => item.name).filter(Boolean))
        setBrandOptions((brands ?? []).map((item) => item.name).filter(Boolean))

        const resolvedType =
          settings?.data?.businessType ||
          settings?.data?.business_type ||
          user?.tenant?.businessType ||
          user?.tenant?.business_type
        if (resolvedType) {
          setTenantBusinessType(resolvedType)
        }
      } catch (err) {
        if (!cancelled) {
          setCategoryOptions([])
          setBrandOptions([])
          toast.error(err.message || 'Could not load brands and categories')
        }
      }
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [user])

  // Reset form cleanly on Add route, or load product on Edit route
  useEffect(() => {
    if (!isEdit) {
      const defaults = getTenantAvailabilityDefaults(tenantBusinessType)
      setForm({
        ...EMPTY_PRODUCT_FORM,
        for_rental: defaults.for_rental,
        for_sale: defaults.for_sale,
      })
      setShowAdvanced(false)
      setFieldErrors({})
      setError(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const loadProduct = async () => {
      setLoading(true)
      setError(null)
      try {
        let loaded = null
        if (location.state?.product && location.state.product.id === id) {
          loaded = location.state.product
        } else {
          loaded = await fetchProductById(id)
        }
        if (cancelled) return
        const formValues = productToForm(loaded)
        if (tenantBusinessType === 'SALES') {
          formValues.for_rental = false
          formValues.for_sale = true
          formValues.daily_rent = '0'
        } else if (tenantBusinessType === 'RENTAL') {
          formValues.for_rental = true
          formValues.for_sale = false
          formValues.sale_price = '0'
        }
        setForm(formValues)
        // Open advanced options automatically if product has advanced values configured
        if (
          loaded.brand ||
          loaded.color ||
          loaded.gender ||
          loaded.description ||
          Number(loaded.purchase_price) > 0
        ) {
          setShowAdvanced(true)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProduct()
    return () => {
      cancelled = true
    }
  }, [id, isEdit, location.state, tenantBusinessType])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: applyFieldLimit(name, value) }))
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleAvailabilityChange = (e) => {
    const { name, checked } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: checked }
      if (!next.for_rental && !next.for_sale) {
        setFieldErrors((errs) => ({
          ...errs,
          availability: 'Purpose is required: please select Rental, Sales, or both',
        }))
      } else {
        setFieldErrors((errs) => {
          if (!errs.availability) return errs
          const { availability: _unused, ...rest } = errs
          return rest
        })
      }
      return next
    })
  }

  const validateForm = () => {
    const errors = {}

    // Required Field: Product Name
    if (!String(form.product_name || '').trim()) {
      errors.product_name = 'Product name is required'
    } else if (String(form.product_name).length > FIELD_LIMITS.product_name) {
      errors.product_name = maxLengthMessage('Product name', FIELD_LIMITS.product_name)
    }

    // Required Field: Product Code
    if (!String(form.product_code || '').trim()) {
      errors.product_code = 'Product code is required'
    } else if (String(form.product_code).length > FIELD_LIMITS.product_code) {
      errors.product_code = maxLengthMessage('Product code', FIELD_LIMITS.product_code)
    }

    // Required Field: Category
    if (!String(form.category || '').trim()) {
      errors.category = 'Category is required'
    }

    // Required Field: Size
    if (!String(form.size || '').trim()) {
      errors.size = 'Size is required'
    } else if (String(form.size).length > FIELD_LIMITS.size) {
      errors.size = maxLengthMessage('Size', FIELD_LIMITS.size)
    }

    // Brand is OPTIONAL - no required validation
    if (String(form.brand || '').length > FIELD_LIMITS.brand) {
      errors.brand = maxLengthMessage('Brand', FIELD_LIMITS.brand)
    }

    if (String(form.color || '').length > FIELD_LIMITS.color) {
      errors.color = maxLengthMessage('Color', FIELD_LIMITS.color)
    }

    if (String(form.description || '').length > FIELD_LIMITS.description) {
      errors.description = maxLengthMessage('Description', FIELD_LIMITS.description)
    }

    // Total quantity: defaults to 1 if blank, but if entered must be non-negative integer
    if (form.total_quantity !== '' && form.total_quantity != null) {
      const totalQty = Number(form.total_quantity)
      if (
        Number.isNaN(totalQty) ||
        totalQty < 0 ||
        !Number.isInteger(totalQty)
      ) {
        errors.total_quantity = 'Total quantity must be 0 or a whole number'
      }
    }

    // Purchase price: defaults to 0 if blank, but if entered must be non-negative
    if (form.purchase_price !== '' && form.purchase_price != null) {
      const purchaseNum = Number(form.purchase_price)
      if (Number.isNaN(purchaseNum) || purchaseNum < 0) {
        errors.purchase_price = 'Purchase price cannot be negative'
      }
    }

    // Availability checks based on tenant business type
    const isRentalAllowed = tenantBusinessType !== 'SALES'
    const isSalesAllowed = tenantBusinessType !== 'RENTAL'

    if (tenantBusinessType === 'SALES_AND_RENTAL' && !form.for_rental && !form.for_sale) {
      errors.availability = 'Purpose is required: please select Rental, Sales, or both'
    }

    // Daily rent: defaults to 0 if blank; only flag if negative or invalid
    if (isRentalAllowed && form.for_rental && form.daily_rent !== '' && form.daily_rent != null) {
      const dailyRent = Number(form.daily_rent)
      if (Number.isNaN(dailyRent) || dailyRent < 0) {
        errors.daily_rent = 'Daily rent cannot be negative'
      }
    }

    // Sale price: defaults to 0 if blank; only flag if negative or invalid
    if (isSalesAllowed && form.for_sale && form.sale_price !== '' && form.sale_price != null) {
      const salePrice = Number(form.sale_price)
      if (Number.isNaN(salePrice) || salePrice < 0) {
        errors.sale_price = 'Sale price cannot be negative'
      }
    }

    return errors
  }

  const handleCatalogCreate = async (name) => {
    const isCategory = catalogDialog === 'category'
    const createItem = isCategory ? createCategory : createBrand
    await createItem(name)

    if (isCategory) {
      setCategoryOptions((prev) => [...new Set([...prev, name])])
    } else {
      setBrandOptions((prev) => [...new Set([...prev, name])])
    }
    setForm((prev) => ({ ...prev, [catalogDialog]: name }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[catalogDialog]
      return next
    })
    toast.success(`${isCategory ? 'Category' : 'Brand'} added`)
    setCatalogDialog(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const errors = validateForm()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      // Auto-open advanced section if any error resides within it
      if (
        errors.brand ||
        errors.total_quantity ||
        errors.purchase_price ||
        errors.daily_rent ||
        errors.sale_price ||
        errors.availability ||
        errors.color ||
        errors.description
      ) {
        setShowAdvanced(true)
      }
      setError('Please fix the highlighted fields and try again.')
      revealFormErrors(errors, {
        message: 'Please fix the highlighted fields and try again.',
        fieldIds: { availability: 'for_rental' },
      })
      return
    }

    setSubmitting(true)

    const isRentalAllowed = tenantBusinessType !== 'SALES'
    const isSalesAllowed = tenantBusinessType !== 'RENTAL'

    let forRental = isRentalAllowed ? Boolean(form.for_rental) : false
    let forSale = isSalesAllowed ? Boolean(form.for_sale) : false

    if (tenantBusinessType === 'RENTAL') {
      forRental = true
      forSale = false
    } else if (tenantBusinessType === 'SALES') {
      forRental = false
      forSale = true
    }

    const availabilityType =
      forRental && forSale ? 'both' : forSale ? 'sell' : 'rent'

    const totalQty =
      form.total_quantity === '' || form.total_quantity == null
        ? 1
        : Math.max(0, Math.trunc(Number(form.total_quantity) || 0))

    const { images, for_rental: _fr, for_sale: _fs, quantity: _qty, ...formFields } = form
    const payload = {
      ...formFields,
      purchase_price: Number(form.purchase_price) || 0,
      daily_rent: forRental ? Number(form.daily_rent) || 0 : 0,
      weekly_rent: 0,
      monthly_rent: 0,
      security_deposit: 0,
      sale_price: forSale ? Number(form.sale_price) || 0 : 0,
      total_quantity: totalQty,
      damaged_quantity: Math.max(0, Math.trunc(Number(form.damaged_quantity) || 0)),
      availability_type: availabilityType,
      size: form.size?.trim() || 'FREE',
      image: serializeProductImages(images),
      category: form.category?.trim() || null,
      brand: form.brand?.trim() || null,
      gender: form.gender?.trim() || null,
      color: form.color?.trim() || null,
      description: form.description?.trim() || null,
      status: form.status || 'Available',
    }

    try {
      if (isEdit) {
        await updateProduct(id, payload)
        navigate(path('/products'), {
          state: { notice: 'Product updated successfully' },
        })
      } else {
        await createProduct(payload)
        navigate(path('/products'), {
          state: { notice: 'Product created successfully' },
        })
      }
    } catch (err) {
      handleFormApiError(err, {
        setFieldErrors,
        setFormError: setError,
        onUsageLimit: (limitInfo) => setUsageLimitData(limitInfo),
        fieldIds: {
          product_code: 'product_code',
          product_name: 'product_name',
          category: 'category',
          size: 'size',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="product-form-loading">Loading product...</div>
  }

  const fieldClass = (name) => `form-field${fieldErrors[name] ? ' has-error' : ''}`

  return (
    <div className="product-form-page">
      <div className="product-form-header page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Inventory</p>
          <h1 className="page-title">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        </div>
        <Link to={path('/products')} className="product-form-back">
          Back to Products
        </Link>
      </div>

      <FormErrorAlert message={error} onDismiss={() => setError(null)} />

      <form className="product-form" onSubmit={handleSubmit} noValidate>
        {/* ========================================================= */}
        {/* 1. REQUIRED FIELDS SECTION                                */}
        {/* ========================================================= */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-text">Basic Information</h2>
              <p className="text-xs text-text-muted">
                Required details to identify and catalog your product.
              </p>
            </div>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Required
            </span>
          </div>

          <div className="product-form-grid">
            <div className={fieldClass('product_name')}>
              <label htmlFor="product_name">
                Product Name <span className="required">*</span>
              </label>
              <input
                id="product_name"
                name="product_name"
                value={form.product_name}
                onChange={handleChange}
                maxLength={FIELD_LIMITS.product_name}
                required
                aria-invalid={Boolean(fieldErrors.product_name)}
                aria-describedby={fieldErrors.product_name ? 'product_name-error' : undefined}
              />
              {fieldErrors.product_name && (
                <p id="product_name-error" className="field-error">{fieldErrors.product_name}</p>
              )}
            </div>

            <div className={fieldClass('product_code')}>
              <label htmlFor="product_code">
                Product Code <span className="required">*</span>
              </label>
              <input
                id="product_code"
                name="product_code"
                value={form.product_code}
                onChange={handleChange}
                maxLength={FIELD_LIMITS.product_code}
                required
                aria-invalid={Boolean(fieldErrors.product_code)}
                aria-describedby={fieldErrors.product_code ? 'product_code-error' : undefined}
              />
              {fieldErrors.product_code && (
                <p id="product_code-error" className="field-error">{fieldErrors.product_code}</p>
              )}
            </div>

            <div className={fieldClass('category')}>
              <label htmlFor="category">
                Category <span className="required">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <FormSelect
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder={categoryOptions.length ? 'Select category' : 'No categories yet'}
                    aria-invalid={Boolean(fieldErrors.category)}
                    options={[
                      ...(!form.category || categoryOptions.includes(form.category)
                        ? []
                        : [{ value: form.category, label: form.category }]),
                      ...categoryOptions.map((opt) => ({ value: opt, label: opt })),
                    ]}
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex size-[2.65rem] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border-0 bg-accent text-base font-bold text-white transition-[background-color,transform] duration-160 hover:bg-accent-hover enabled:active:translate-y-px"
                  title="Add New Category"
                  aria-label="Add New Category"
                  onClick={() => setCatalogDialog('category')}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
              {fieldErrors.category && (
                <p className="field-error">{fieldErrors.category}</p>
              )}
            </div>

            <div className={fieldClass('size')}>
              <label htmlFor="size">
                Size <span className="required">*</span>
              </label>
              <input
                id="size"
                name="size"
                value={form.size}
                onChange={handleChange}
                maxLength={FIELD_LIMITS.size}
                placeholder="e.g. M, L, XL or FREE"
                aria-invalid={Boolean(fieldErrors.size)}
              />
              {fieldErrors.size && <p className="field-error">{fieldErrors.size}</p>}
            </div>
          </div>

          {/* Dynamic Availability & Pricing based on Tenant businessType */}
          <div
            className={cn(
              fieldClass('availability'),
              'form-field-full mt-4 rounded-xl border border-border bg-surface-muted p-3.5 sm:p-4',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[0.9rem] font-bold text-text">
                Available For (Purpose) <span className="font-bold text-[#dc2626]">*</span>
              </label>
              <span className="text-[0.75rem] text-text-muted">
                Defaults to ₹0 if left empty
              </span>
            </div>

            {/* If tenant is SALES_AND_RENTAL: show both checkboxes */}
            {tenantBusinessType === 'SALES_AND_RENTAL' && (
              <>
                <p className="mt-1 mb-0 text-[0.8rem] text-text-secondary">
                  Select purpose for this product. Auto-selected based on your shop type (Rental & Sales).
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[0.9rem] font-semibold text-text">
                    <input
                      id="for_rental"
                      type="checkbox"
                      name="for_rental"
                      checked={form.for_rental}
                      onChange={handleAvailabilityChange}
                      className="size-[1.05rem] accent-[#d97706]"
                    />
                    Rental
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[0.9rem] font-semibold text-text">
                    <input
                      type="checkbox"
                      name="for_sale"
                      checked={form.for_sale}
                      onChange={handleAvailabilityChange}
                      className="size-[1.05rem] accent-[#d97706]"
                    />
                    Sales
                  </label>
                </div>
              </>
            )}

            {/* If tenant is RENTAL: only rental banner */}
            {tenantBusinessType === 'RENTAL' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[0.8rem] font-semibold text-accent">
                  <i className="fa-solid fa-check text-[0.75rem]" aria-hidden="true" />
                  Rental Only
                </span>
                <span className="text-[0.78rem] text-text-muted">
                  Auto-selected based on shop profile (Rental). Set daily rental rate below.
                </span>
              </div>
            )}

            {/* If tenant is SALES: only sales banner */}
            {tenantBusinessType === 'SALES' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[0.8rem] font-semibold text-accent">
                  <i className="fa-solid fa-check text-[0.75rem]" aria-hidden="true" />
                  Sales Only
                </span>
                <span className="text-[0.78rem] text-text-muted">
                  Auto-selected based on shop profile (Sales). Set sale price below.
                </span>
              </div>
            )}

            {fieldErrors.availability && (
              <p className="field-error">{fieldErrors.availability}</p>
            )}

            {/* Dynamic Price Inputs */}
            <div className="product-form-grid mt-4">
              {(tenantBusinessType === 'RENTAL' ||
                (tenantBusinessType === 'SALES_AND_RENTAL' && form.for_rental)) && (
                <div className={fieldClass('daily_rent')}>
                  <label htmlFor="daily_rent">Daily Rent (₹)</label>
                  <NumberInput
                    id="daily_rent"
                    name="daily_rent"
                    min="0"
                    value={form.daily_rent}
                    onChange={handleChange}
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.daily_rent)}
                  />
                  {fieldErrors.daily_rent && (
                    <p className="field-error">{fieldErrors.daily_rent}</p>
                  )}
                </div>
              )}

              {(tenantBusinessType === 'SALES' ||
                (tenantBusinessType === 'SALES_AND_RENTAL' && form.for_sale)) && (
                <div className={fieldClass('sale_price')}>
                  <label htmlFor="sale_price">Sale Price (₹)</label>
                  <NumberInput
                    id="sale_price"
                    name="sale_price"
                    min="0"
                    value={form.sale_price}
                    onChange={handleChange}
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.sale_price)}
                  />
                  {fieldErrors.sale_price && (
                    <p className="field-error">{fieldErrors.sale_price}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-field form-field-full mt-4">
            <label>Product Images</label>
            <ProductImageField
              value={form.images}
              product={{ id, product_name: form.product_name }}
              onChange={(images) => setForm((prev) => ({ ...prev, images }))}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. ADVANCED & OPTIONAL OPTIONS SECTION                    */}
        {/* ========================================================= */}
        <div className="mt-4 sm:mt-5 rounded-xl sm:rounded-2xl border border-border bg-surface/70 p-3.5 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text">Advanced & Optional Details</h2>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[0.7rem] font-medium text-text-muted">
                  Optional
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Brand, stock quantity, purchase cost, color, gender, and description.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text shadow-sm transition hover:border-accent hover:bg-surface-hover"
              aria-expanded={showAdvanced}
            >
              <i className={cn('fa-solid', showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down')} />
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-5 border-t border-border/60 pt-5">
              <div className="product-form-grid">
                {/* Brand is optional */}
                <div className={fieldClass('brand')}>
                  <label htmlFor="brand">Brand</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <FormSelect
                        id="brand"
                        name="brand"
                        value={form.brand}
                        onChange={handleChange}
                        placeholder={brandOptions.length ? 'Select brand (optional)' : 'No brands yet'}
                        aria-invalid={Boolean(fieldErrors.brand)}
                        options={[
                          ...(!form.brand || brandOptions.includes(form.brand)
                            ? []
                            : [{ value: form.brand, label: form.brand }]),
                          ...brandOptions.map((opt) => ({ value: opt, label: opt })),
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-[2.65rem] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border-0 bg-accent text-base font-bold text-white transition-[background-color,transform] duration-160 hover:bg-accent-hover enabled:active:translate-y-px"
                      title="Add New Brand"
                      aria-label="Add New Brand"
                      onClick={() => setCatalogDialog('brand')}
                    >
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </div>
                  {fieldErrors.brand && <p className="field-error">{fieldErrors.brand}</p>}
                </div>

                {/* Total Quantity */}
                <div className={fieldClass('total_quantity')}>
                  <div className="flex items-center justify-between">
                    <label htmlFor="total_quantity">Total Quantity (Stock Owned)</label>
                    {isEdit && (
                      <span className="text-[0.7rem] font-medium text-text-muted">
                        Managed via Stock Actions
                      </span>
                    )}
                  </div>
                  <NumberInput
                    integer
                    id="total_quantity"
                    name="total_quantity"
                    min="0"
                    value={form.total_quantity}
                    onChange={handleChange}
                    readOnly={isEdit}
                    disabled={isEdit}
                    placeholder="1"
                    className={
                      isEdit ? 'input-readonly cursor-not-allowed select-none opacity-90' : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.total_quantity)}
                    title={
                      isEdit
                        ? 'Stock owned is read-only. Use Add Stock on the Products page to increase inventory.'
                        : undefined
                    }
                  />
                  {isEdit ? (
                    <p className="mt-1 text-[0.75rem] text-text-muted">
                      To add new stock, use the{' '}
                      <strong className="text-text-secondary">Add Stock</strong> button on the
                      Products page to preserve inventory history.
                    </p>
                  ) : (
                    <p className="mt-1 text-[0.75rem] text-text-muted">
                      Defaults to 1 if left empty.
                    </p>
                  )}
                  {fieldErrors.total_quantity && (
                    <p className="field-error">{fieldErrors.total_quantity}</p>
                  )}
                </div>

                {/* Damaged Quantity in Edit Mode */}
                {isEdit && (
                  <div className="form-field">
                    <div className="flex items-center justify-between">
                      <label htmlFor="damaged_quantity">Damaged Quantity</label>
                      <span className="text-[0.7rem] font-medium text-text-muted">Read-only</span>
                    </div>
                    <NumberInput
                      integer
                      id="damaged_quantity"
                      name="damaged_quantity"
                      min="0"
                      value={form.damaged_quantity}
                      readOnly
                      disabled
                      className="input-readonly cursor-not-allowed select-none opacity-90"
                      title="Damaged quantity is tracked automatically. Use Restore Damaged to return items to circulation."
                    />
                    <p className="mt-1 text-[0.75rem] text-text-muted">
                      Restore damaged units via the{' '}
                      <strong className="text-text-secondary">Restore Damaged</strong> action on the
                      Products page.
                    </p>
                  </div>
                )}

                {/* Purchase Price */}
                <div className={fieldClass('purchase_price')}>
                  <label htmlFor="purchase_price">Purchase Price / Cost (₹)</label>
                  <NumberInput
                    id="purchase_price"
                    name="purchase_price"
                    min="0"
                    value={form.purchase_price}
                    onChange={handleChange}
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.purchase_price)}
                  />
                  {fieldErrors.purchase_price && (
                    <p className="field-error">{fieldErrors.purchase_price}</p>
                  )}
                </div>

                {/* Color */}
                <div className={fieldClass('color')}>
                  <label htmlFor="color">Color</label>
                  <input
                    id="color"
                    name="color"
                    value={form.color}
                    onChange={handleChange}
                    maxLength={FIELD_LIMITS.color}
                    placeholder="e.g. Maroon, Gold"
                    aria-invalid={Boolean(fieldErrors.color)}
                  />
                  {fieldErrors.color && <p className="field-error">{fieldErrors.color}</p>}
                </div>

                {/* Gender */}
                <div className="form-field">
                  <label htmlFor="gender">Gender</label>
                  <FormSelect
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    placeholder="Select gender"
                    options={GENDER_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className={cn(fieldClass('description'), 'form-field-full mt-4')}>
                <div className="flex items-center justify-between">
                  <label htmlFor="description">Description</label>
                  <span className="text-[0.72rem] font-semibold text-text-muted">
                    {String(form.description || '').length} / {FIELD_LIMITS.description}
                  </span>
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  maxLength={FIELD_LIMITS.description}
                  placeholder="Enter product description (optional, up to 1200 characters)..."
                  aria-invalid={Boolean(fieldErrors.description)}
                />
                {fieldErrors.description && (
                  <p className="field-error">{fieldErrors.description}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. FORM ACTIONS                                           */}
        {/* ========================================================= */}
        <div className="product-form-actions mt-6">
          <Link to={path('/products')} className="product-form-cancel">
            Cancel
          </Link>
          <button type="submit" className="product-form-submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>

      <UsageLimitModal
        open={Boolean(usageLimitData)}
        onClose={() => setUsageLimitData(null)}
        limitData={usageLimitData}
        tenantSlug={user?.tenant?.slug}
      />

      <CatalogCreateDialog
        open={Boolean(catalogDialog)}
        label={catalogDialog === 'category' ? 'Category' : 'Brand'}
        placeholder={catalogDialog === 'category' ? 'e.g. Sherwani' : 'e.g. Manyavar'}
        maxLength={
          catalogDialog === 'category' ? FIELD_LIMITS.category : FIELD_LIMITS.brand
        }
        onCreate={handleCatalogCreate}
        onCancel={() => setCatalogDialog(null)}
      />
    </div>
  )
}

export default ProductFormPage

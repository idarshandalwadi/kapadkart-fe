import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createSale,
  fetchNextSaleBillNo,
  fetchSaleById,
  updateSale,
} from '@/features/sell/api/sales'
import SaleBillPrint from '@/features/sell/components/SaleBillPrint'
import {
  EMPTY_SALE_FORM,
  validateSaleForm,
  isSaleEditable,
} from '@/features/sell/constants/sales'
import {
  calcLineTotal,
  calcSaleAmounts,
  createSaleLineItem,
  normalizeLineItem,
} from '@/features/sell/utils/saleLineItems'
import ProductSearchSelect, {
  isProductUnavailable,
  productAvailableQuantity,
} from '@/features/products/components/ProductSearchSelect'
import { fetchProductById } from '@/features/products/api/products'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import { fetchSettings } from '@/features/settings/api/settings'
import { printBill } from '@/shared/utils/printBill'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import {
  parseSelectedProducts,
  serializeLineItems,
} from '@/features/bookings/utils/bookingLineItems'
import { useTenant } from '@/shared/tenant/TenantContext'
import NumberInput from '@/shared/components/NumberInput'
import { cn } from '@/shared/utils/cn'
import { revealFormErrors, handleFormApiError } from '@/shared/utils/formErrors'
import { UsageLimitModal } from '@/shared/components/UsageLimitModal'
import { FormErrorAlert } from '@/shared/components/FormErrorAlert'
import { applyFieldLimit, FIELD_LIMITS } from '@/shared/constants/fieldLimits'

function formatMoneyInput(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return String(num)
}

function saleToForm(sale, productsMap = {}) {
  let rawItems = []
  let legacyText = ''
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    rawItems = sale.items
  } else {
    const parsed = parseSelectedProducts(sale.selected_products)
    rawItems = parsed.items
    legacyText = parsed.legacyText
  }

  const items = (rawItems || []).map((it) => {
    const prod = productsMap[String(it.product_id)] || it.product || {}
    const currentStock = Number(
      prod.available_for_sale ??
      prod.available_quantity ??
      prod.total_quantity ??
      prod.quantity ??
      0,
    )
    const existingQty = Number(it.quantity) || 1
    const maxQty = currentStock + existingQty
    const rawPrice = it.unit_price !== undefined ? it.unit_price : it.price
    const unitPrice = Number.isFinite(Number(rawPrice)) && Number(rawPrice) > 0 ? Number(rawPrice) : ''

    return {
      key: `item-${it.id || it.product_id}`,
      product_id: it.product_id,
      product_name: prod.product_name || it.product_name || `Product #${it.product_id}`,
      product_code: prod.product_code || it.product_code || null,
      quantity: existingQty,
      max_quantity: maxQty,
      unit_price: unitPrice,
      line_total: calcLineTotal(existingQty, Number(unitPrice) || 0),
      image: prod.image || it.image || it.product?.image || it.product?.image_url || it.image_url || null,
      image_url: prod.image || it.image || it.product?.image || it.product?.image_url || it.image_url || null,
      product: prod,
    }
  })

  const amounts = calcSaleAmounts({
    items,
    discountAmount: sale.discount_amount ?? null,
    taxRate: sale.tax_rate ?? 0,
    paidAmount: sale.paid_amount ?? null,
  })

  return {
    ...EMPTY_SALE_FORM,
    bill_no: sale.bill_no || '',
    customer_name: sale.customer_name || '',
    phone_number: sale.phone_number || '',
    village_address: sale.village_address || '',
    status: sale.status || 'completed',
    selected_products: sale.selected_products || '',
    line_items: items,
    total_quantity: String(amounts.total_quantity || 0),
    legacy_products: legacyText,
    subtotal: formatMoneyInput(amounts.subtotal),
    discount_amount: formatMoneyInput(amounts.discount_amount),
    tax_rate: formatMoneyInput(amounts.tax_rate),
    tax_amount: formatMoneyInput(amounts.tax_amount),
    sale_total: formatMoneyInput(amounts.sale_total),
    paid_amount: formatMoneyInput(amounts.paid_amount),
    notes: sale.notes || '',
    created_at: sale.created_at,
  }
}

function SaleFormPage() {
  const { path, tenant } = useTenant()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({ ...EMPTY_SALE_FORM, line_items: [] })
  const [fieldErrors, setFieldErrors] = useState({})
  const [nextBillNo, setNextBillNo] = useState('')
  const [settings, setSettings] = useState(null)
  const [productId, setProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [usageLimitData, setUsageLimitData] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [removingItem, setRemovingItem] = useState(null)

  const companyTaxRate = Number(settings?.tax_rate) || 0
  const billNo = isEdit ? form.bill_no : nextBillNo

  const resolveEffectiveTaxRate = (formTaxRate) => {
    // New sales always use company settings tax rate
    if (!isEdit) return Number(settings?.tax_rate) || 0
    // Existing sales strictly preserve the bill's saved tax rate (0% if created without GST)
    if (formTaxRate !== undefined && formTaxRate !== null && formTaxRate !== '') {
      return Number(formTaxRate) || 0
    }
    return 0
  }

  const syncTotals = (
    lineItems,
    { paidAmount = null, discountAmount = null, taxRate: rate = 0 } = {},
  ) => {
    const amounts = calcSaleAmounts({
      items: lineItems,
      discountAmount,
      taxRate: rate,
      paidAmount,
    })

    return {
      line_items: lineItems,
      selected_products: serializeLineItems(lineItems),
      total_quantity: String(amounts.total_quantity || 0),
      subtotal: formatMoneyInput(amounts.subtotal),
      discount_amount: formatMoneyInput(amounts.discount_amount),
      tax_rate: formatMoneyInput(amounts.tax_rate),
      tax_amount: formatMoneyInput(amounts.tax_amount),
      sale_total: formatMoneyInput(amounts.sale_total),
      paid_amount: formatMoneyInput(amounts.paid_amount),
    }
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [billResult, settingsResult, saleResult] = await Promise.all([
          isEdit ? Promise.resolve(null) : fetchNextSaleBillNo().catch(() => null),
          fetchSettings().catch(() => null),
          isEdit ? fetchSaleById(id).catch(() => null) : Promise.resolve(null),
        ])

        if (cancelled) return

        const nextSettings = settingsResult?.data ?? settingsResult
        if (nextSettings) setSettings(nextSettings)
        const taxRate = Number(nextSettings?.tax_rate) || 0

        if (!isEdit) {
          const resolvedBillNo =
            billResult?.data?.bill_no ||
            billResult?.bill_no ||
            billResult?.data ||
            `S-${Date.now().toString().slice(-6)}`
          setNextBillNo(resolvedBillNo)
          setForm({
            ...EMPTY_SALE_FORM,
            bill_no: resolvedBillNo,
            line_items: [],
            ...syncTotals([], { taxRate }),
          })
          setProductId('')
          setSelectedProduct(null)
          setQuantity('1')
          setFieldErrors({})
          setViewingProduct(null)
          setRemovingItem(null)
        }

        if (isEdit && saleResult) {
          if (!isSaleEditable(saleResult)) {
            toast.error('Editing is no longer allowed after 30 days from sale date.')
            navigate(path('/sales'))
            return
          }

          const rawItems = Array.isArray(saleResult.items) && saleResult.items.length > 0
            ? saleResult.items
            : parseSelectedProducts(saleResult.selected_products).items

          const productIds = [
            ...new Set(
              (rawItems || [])
                .map((it) => it.product_id)
                .filter(Boolean)
                .map(String),
            ),
          ]

          
          const products = await Promise.all(
            productIds.map((pId) =>
              fetchProductById(pId, { availability_type: 'sell' }).catch(() => null),
            ),
          )

          if (cancelled) return

          const productsMap = {}
          for (const p of products) {
            if (p) productsMap[String(p.id)] = p
          }

          const nextForm = saleToForm(saleResult, productsMap)
          const lockedTaxRate =
            saleResult.tax_rate !== undefined && saleResult.tax_rate !== null
              ? Number(saleResult.tax_rate)
              : saleResult.taxRate !== undefined && saleResult.taxRate !== null
                ? Number(saleResult.taxRate)
                : Number(nextForm.tax_rate) || 0

          if (nextForm.line_items.length) {
            Object.assign(
              nextForm,
              syncTotals(nextForm.line_items, {
                paidAmount: nextForm.paid_amount,
                discountAmount: nextForm.discount_amount,
                taxRate: lockedTaxRate,
              }),
            )
          }
          nextForm.tax_rate = String(lockedTaxRate)
          setForm(nextForm)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const handleViewProduct = async (productId) => {
    if (!productId) return
    try {
      const product = await fetchProductById(productId)
      setViewingProduct(product)
    } catch (err) {
      toast.error('Failed to load product details.')
    }
  }

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let nextValue = applyFieldLimit(name, value)

    if (name === 'phone_number') {
      nextValue = value.replace(/\D/g, '').slice(0, 10)
    }

    setForm((prev) => {
      const currentTaxRate = resolveEffectiveTaxRate(prev.tax_rate)
      const next = { ...prev, [name]: nextValue }

      if (name === 'discount_amount') {
        const synced = syncTotals(prev.line_items, {
          discountAmount: nextValue,
          paidAmount: prev.paid_amount,
          taxRate: currentTaxRate,
        })
        Object.assign(next, synced)
      } else if (name === 'paid_amount') {
        const synced = syncTotals(prev.line_items, {
          discountAmount: null,
          paidAmount: nextValue,
          taxRate: currentTaxRate,
        })
        Object.assign(next, synced)
        next[name] = nextValue
      }

      return next
    })

    if (name === 'paid_amount') {
      const paid = Number(nextValue)
      const currentTaxRate = resolveEffectiveTaxRate(form.tax_rate)
      const expectedAmounts = calcSaleAmounts({
        items: form.line_items,
        discountAmount: null,
        taxRate: currentTaxRate,
        paidAmount: nextValue,
      })
      const gross = Number(expectedAmounts.subtotal || 0) + Number(expectedAmounts.tax_amount || 0)
      if (nextValue !== '' && Number.isFinite(paid) && paid > gross + 0.01) {
        setFieldErrors((prev) => ({
          ...prev,
          paid_amount: 'Paid amount cannot exceed bill amount',
        }))
      } else {
        clearFieldError('paid_amount')
      }
    } else if (name === 'discount_amount') {
      clearFieldError('discount_amount')
      const currentTaxRate = resolveEffectiveTaxRate(form.tax_rate)
      const expectedAmounts = calcSaleAmounts({
        items: form.line_items,
        discountAmount: nextValue,
        taxRate: currentTaxRate,
        paidAmount: form.paid_amount,
      })
      const total = Number(expectedAmounts.sale_total)
      const paid = Number(form.paid_amount)
      if (form.paid_amount !== '' && Number.isFinite(paid) && Number.isFinite(total) && paid > total + 0.01) {
        setFieldErrors((prev) => ({
          ...prev,
          paid_amount: 'Paid amount cannot exceed final amount',
        }))
      } else {
        clearFieldError('paid_amount')
      }
    } else {
      clearFieldError(name)
    }
  }

  const handleAddProduct = () => {
    if (!productId || !selectedProduct) {
      setFieldErrors((prev) => ({
        ...prev,
        selected_products: 'Please select a product.',
      }))
      return
    }

    if (isProductUnavailable(selectedProduct)) {
      setFieldErrors((prev) => ({
        ...prev,
        selected_products: 'This product is sold out and cannot be added',
      }))
      return
    }

    const availableStock = productAvailableQuantity(selectedProduct)
    const qty = Math.max(1, Math.trunc(Number(quantity) || 1))

    const existingIndex = form.line_items.findIndex(
      (item) => String(item.product_id) === String(selectedProduct.id),
    )

    const existingItem = existingIndex >= 0 ? form.line_items[existingIndex] : null
    const effectiveStock = existingItem
      ? Number(existingItem.max_quantity || availableStock)
      : availableStock

    const nextQty = existingItem ? Number(existingItem.quantity) + qty : qty

    if (nextQty > effectiveStock) {
      setFieldErrors((prev) => ({
        ...prev,
        selected_products: `Insufficient stock. Only ${effectiveStock} item${effectiveStock === 1 ? '' : 's'} available for ${selectedProduct.product_name}.`,
      }))
      return
    }

    const priceRaw = selectedProduct.sale_price
    const baseUnitPrice = Number.isFinite(Number(priceRaw)) && Number(priceRaw) >= 0 ? Number(priceRaw) : 0
    const unitPrice =
      existingItem && Number(existingItem.unit_price) > 0
        ? Number(existingItem.unit_price)
        : baseUnitPrice

    const nextItems = [...form.line_items]
    if (existingIndex >= 0) {
      nextItems[existingIndex] = normalizeLineItem({
        ...existingItem,
        quantity: nextQty,
        unit_price: unitPrice,
        max_quantity: effectiveStock,
        line_total: calcLineTotal(nextQty, unitPrice),
      })
    } else {
      nextItems.push(createSaleLineItem(selectedProduct, qty, unitPrice))
    }

    const currentTaxRate = resolveEffectiveTaxRate(form.tax_rate)
    setForm((prev) => {
      const isAutoPayingFull = !prev.paid_amount || Number(prev.paid_amount) === Number(prev.sale_total) || Number(prev.discount_amount || 0) === 0
      const paidParam = isAutoPayingFull ? null : prev.paid_amount
      return {
        ...prev,
        ...syncTotals(nextItems, {
          discountAmount: isAutoPayingFull ? null : prev.discount_amount,
          paidAmount: paidParam,
          taxRate: currentTaxRate,
        }),
      }
    })

    setProductId('')
    setSelectedProduct(null)
    setQuantity('1')
    clearFieldError('selected_products')
    clearFieldError('sale_total')
  }

  const handleLineChange = (key, field, value) => {
    setForm((prev) => {
      const nextItems = prev.line_items.map((item) => {
        if (item.key !== key) return item

        if (field === 'quantity') {
          const maxQty = Number(item.max_quantity) || Number(value) || 1
          const qty = Math.min(maxQty, Math.max(1, Math.trunc(Number(value) || 1)))
          return normalizeLineItem({
            ...item,
            quantity: qty,
            max_quantity: maxQty,
            line_total: calcLineTotal(qty, Number(item.unit_price) || 0),
          })
        }

        if (field === 'unit_price') {
          // Store raw string value so user can freely clear/type (e.g. backspace "0" → "")
          // Do NOT call normalizeLineItem here — roundMoney('') === 0, which re-locks the field
          return {
            ...item,
            unit_price: value,
            line_total: calcLineTotal(item.quantity, Number(value) || 0),
          }
        }

        return item
      })

      const hasInvalidPrice = nextItems.some(
        (it) => it.unit_price === '' || !Number.isFinite(Number(it.unit_price)) || Number(it.unit_price) <= 0
      )
      if (hasInvalidPrice) {
        setFieldErrors((prev) => ({ ...prev, selected_products: 'Unit price must be greater than 0' }))
      } else {
        clearFieldError('selected_products')
      }
      clearFieldError('sale_total')

      const currentTaxRate = resolveEffectiveTaxRate(prev.tax_rate)
      const isAutoPayingFull = !prev.paid_amount || Number(prev.paid_amount) === Number(prev.sale_total) || Number(prev.discount_amount || 0) === 0
      const paidParam = isAutoPayingFull ? null : prev.paid_amount
      return {
        ...prev,
        ...syncTotals(nextItems, {
          discountAmount: isAutoPayingFull ? null : prev.discount_amount,
          paidAmount: paidParam,
          taxRate: currentTaxRate,
        }),
      }
    })
  }

  const handleRemoveLine = (key) => {
    setForm((prev) => {
      const nextItems = prev.line_items.filter((item) => item.key !== key)
      const currentTaxRate = resolveEffectiveTaxRate(prev.tax_rate)
      const isAutoPayingFull = !prev.paid_amount || Number(prev.paid_amount) === Number(prev.sale_total) || Number(prev.discount_amount || 0) === 0
      const paidParam = isAutoPayingFull ? null : prev.paid_amount
      return {
        ...prev,
        ...syncTotals(nextItems, {
          discountAmount: isAutoPayingFull ? null : prev.discount_amount,
          paidAmount: paidParam,
          taxRate: currentTaxRate,
        }),
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const errors = validateSaleForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields and try again.')
      revealFormErrors(errors, {
        message: 'Please fix the highlighted fields and try again.',
        fieldIds: { selected_products: 'add_product' },
      })
      return
    }

    setSubmitting(true)
    try {
      const currentTaxRate = resolveEffectiveTaxRate(form.tax_rate)
      const lineItems = form.line_items.map(normalizeLineItem)
      const amounts = calcSaleAmounts({
        items: lineItems,
        discountAmount: form.discount_amount,
        taxRate: currentTaxRate,
        paidAmount: form.paid_amount,
      })

      const items = (amounts.breakdown_items || lineItems).map((item) => ({
        product_id: item.product_id,
        quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
        unit_price: Number(item.unit_price) || 0,
        discount_amount: Number(item.discount_amount) || 0,
        tax_amount: Number(item.tax_amount) || 0,
        total_amount: Number(item.total_amount) || (Math.max(1, Math.trunc(Number(item.quantity) || 1))) * (Number(item.unit_price) || 0),
      }))

      const payload = {
        customer_name: form.customer_name.trim(),
        phone_number: form.phone_number.trim(),
        village_address: form.village_address.trim() || null,
        selected_products: serializeLineItems(lineItems),
        items,
        discount_amount: amounts.discount_amount,
        tax_rate: currentTaxRate,
        tax_amount: amounts.tax_amount,
        sale_total: amounts.sale_total,
        paid_amount: amounts.paid_amount,
        notes: form.notes.trim() || null,
        status: form.status || 'completed',
      }

      if (isEdit) {
        await updateSale(id, payload)
      } else {
        await createSale({
          ...payload,
          status: 'completed',
        })
      }

      navigate(path('/sales'), {
        state: {
          notice: isEdit ? 'Sale updated successfully' : 'Sale created successfully',
        },
      })
    } catch (err) {
      handleFormApiError(err, {
        setFieldErrors,
        setFormError: setError,
        onUsageLimit: (limitInfo) => setUsageLimitData(limitInfo),
        fieldIds: {
          customer_name: 'customer_name',
          phone_number: 'phone_number',
          selected_products: 'add_product',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (name) => `form-field${fieldErrors[name] ? ' has-error' : ''}`

  const handleBillAction = async () => {
    setError(null)

    const errors = validateSaleForm(form)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError('Please fill required fields before saving and printing.')
      revealFormErrors(errors, {
        message: 'Please fill required fields before saving and printing.',
        fieldIds: { selected_products: 'add_product' },
      })
      return
    }

    setSubmitting(true)
    try {
      const lineItems = form.line_items.map(normalizeLineItem)
      const amounts = calcSaleAmounts({
        items: lineItems,
        discountAmount: form.discount_amount,
        taxRate: companyTaxRate,
        paidAmount: form.paid_amount,
      })

      const items = lineItems.map((item) => ({
        product_id: item.product_id,
        quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
        unit_price: Number(item.unit_price) || 0,
        total_amount: (Math.max(1, Math.trunc(Number(item.quantity) || 1))) * (Number(item.unit_price) || 0),
      }))

      const payload = {
        customer_name: form.customer_name.trim(),
        phone_number: form.phone_number.trim(),
        village_address: form.village_address.trim() || null,
        selected_products: serializeLineItems(lineItems),
        items,
        discount_amount: amounts.discount_amount,
        tax_rate: companyTaxRate,
        tax_amount: amounts.tax_amount,
        sale_total: amounts.sale_total,
        paid_amount: amounts.paid_amount,
        notes: form.notes.trim() || null,
        status: form.status || 'completed',
      }

      let currentBillNo = form.bill_no || nextBillNo
      if (isEdit) {
        await updateSale(id, payload)
      } else {
        const res = await createSale({
          ...payload,
          status: 'completed',
        })
        const data = res?.data || res
        if (data?.bill_no) currentBillNo = data.bill_no
      }

      await printBill({
        customerName: form.customer_name,
        billNo: currentBillNo,
        date: form.created_at || new Date(),
      })

      navigate(path('/sales'), {
        state: {
          notice: isEdit
            ? 'Sale updated and printed successfully'
            : 'Sale created and printed successfully',
        },
      })
    } catch (err) {
      handleFormApiError(err, {
        setFieldErrors,
        setFormError: setError,
        onUsageLimit: (limitInfo) => setUsageLimitData(limitInfo),
        fieldIds: {
          customer_name: 'customer_name',
          phone_number: 'phone_number',
          selected_products: 'add_product',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Sale' : 'New Sale'}</h1>
          </div>
        </header>
        <section className="form-card animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-surface-muted" />
          <div className="h-10 w-full rounded bg-surface-muted" />
          <div className="h-10 w-full rounded bg-surface-muted" />
        </section>
      </div>
    )
  }

  const printForm = {
    ...form,
    selected_products:
      form.line_items.length > 0
        ? serializeLineItems(form.line_items)
        : form.legacy_products || form.selected_products,
    line_items: form.line_items,
    subtotal: Number(form.subtotal) || 0,
    discount_amount: Number(form.discount_amount) || 0,
    tax_rate: Number(form.tax_rate) || companyTaxRate,
    tax_amount: Number(form.tax_amount) || 0,
    sale_total: Number(form.sale_total) || 0,
    paid_amount: Number(form.paid_amount) || 0,
  }

  return (
    <div className="product-form-page">
      <div className="product-form-header page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Sales</p>
          <h1 className="page-title">{isEdit ? 'Edit Sale' : 'New Sale'}</h1>
          <p className="page-lead">
            {isEdit
              ? 'Update sale details, items, or payment records.'
              : 'Create a new sale invoice with accurate inventory and payment tracking.'}
          </p>
        </div>
        <div className="product-form-header-aside">
          <div className="booking-bill-no">
            <span className="booking-bill-no-label">Bill No.</span>
            <span className="booking-bill-no-value">{billNo || '—'}</span>
          </div>
        </div>
      </div>

      <FormErrorAlert message={error} onDismiss={() => setError(null)} />

      <form className="product-form" onSubmit={handleSubmit} noValidate>
        {/* Customer Information */}
        <div className="product-form-grid">
          <div className={fieldClass('customer_name')}>
            <label htmlFor="customer_name">
              Customer Name <span className="required">*</span>
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              value={form.customer_name}
              onChange={handleChange}
              maxLength={FIELD_LIMITS.customer_name}
              placeholder="e.g. Raj Patel"
              aria-invalid={Boolean(fieldErrors.customer_name)}
            />
            {fieldErrors.customer_name && (
              <p className="field-error">{fieldErrors.customer_name}</p>
            )}
          </div>

          <div className={fieldClass('phone_number')}>
            <label htmlFor="phone_number">
              Phone Number <span className="required">*</span>
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              value={form.phone_number}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              maxLength={10}
              aria-invalid={Boolean(fieldErrors.phone_number)}
            />
            {fieldErrors.phone_number && (
              <p className="field-error">{fieldErrors.phone_number}</p>
            )}
          </div>

          <div className={`${fieldClass('village_address')} form-field-full`}>
            <label htmlFor="village_address">Village / Address</label>
            <input
              id="village_address"
              name="village_address"
              type="text"
              value={form.village_address}
              onChange={handleChange}
              maxLength={FIELD_LIMITS.village_address}
              placeholder="e.g. Katargam, Surat"
              aria-invalid={Boolean(fieldErrors.village_address)}
            />
            {fieldErrors.village_address && (
              <p className="field-error">{fieldErrors.village_address}</p>
            )}
          </div>
        </div>

        {/* Sale Items Section */}
        <div
          className={cn(
            fieldClass('selected_products'),
            'form-field-full mt-1 rounded-xl border border-border bg-surface-muted p-3.5',
          )}
        >
          <label className="text-[0.9rem] text-text font-bold">
            Sale Items <span className="required">*</span>
          </label>
          <p className="mt-0.5 mb-0 text-[0.8rem] text-text-secondary">
            Only sellable products with stock are listed. Stock is reduced when the sale is saved.
          </p>

          <div className="mt-2.5 grid grid-cols-1 items-end gap-3 min-[720px]:grid-cols-[minmax(0,1fr)_6.5rem_auto]">
            <div className="form-field">
              <label htmlFor="add_product">Product</label>
              <ProductSearchSelect
                id="add_product"
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value)
                  const prod = event.product ?? null
                  setSelectedProduct(prod)
                  clearFieldError('selected_products')
                }}
                availabilityType="sell"
                placeholder="Search sellable products…"
                emptyMessage="No sellable products found"
                aria-invalid={Boolean(fieldErrors.selected_products)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="add_quantity">Qty</label>
              <NumberInput
                id="add_quantity"
                integer
                min="1"
                max={selectedProduct ? productAvailableQuantity(selectedProduct) : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="h-[2.65rem] cursor-pointer rounded-[9px] border-0 bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_55%,#d97706_100%)] px-5 text-[0.9rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-55 shadow-[0_4px_12px_rgba(217,119,6,0.22)] hover:brightness-[1.03] transition-all"
              onClick={handleAddProduct}
            >
              Add Item
            </button>
          </div>

          {form.legacy_products && form.line_items.length === 0 && (
            <p className="mt-[0.85rem] mb-0 text-[0.85rem] text-text-secondary">
              Previous free-text products: <strong>{form.legacy_products}</strong>. Add products
              above to replace them on the bill.
            </p>
          )}

          {form.line_items.length > 0 ? (
            <div className="mt-[0.85rem] overflow-x-auto rounded-[10px] border border-border bg-white shadow-2xs">
              <table className="w-full min-w-[560px] border-collapse text-[0.88rem] [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-[0.65rem] [&_td]:align-middle [&_th]:border-b [&_th]:border-border [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-[0.65rem] [&_th]:text-left [&_th]:align-middle [&_th]:text-[0.72rem] [&_th]:font-bold [&_th]:tracking-[0.04em] [&_th]:text-text-secondary [&_th]:uppercase [&_tr:last-child_td]:border-b-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price (₹)</th>
                    <th>Amount</th>
                    <th aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {form.line_items.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <button
                          type="button"
                          className="block cursor-pointer border-0 bg-transparent p-0 text-left hover:underline group"
                          onClick={() => handleViewProduct(item.product_id)}
                        >
                          <span className="block font-semibold text-accent group-hover:text-accent-hover transition-colors">{item.product_name}</span>
                          <div className="flex items-center gap-2 mt-[0.15rem]">
                            {item.product_code && (
                              <span className="block text-[0.75rem] text-text-secondary group-hover:text-text-muted transition-colors">
                                {item.product_code}
                              </span>
                            )}
                            {item.max_quantity != null && (
                              <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-medium" title="Available stock (read-only)">
                                Stock: {item.max_quantity}
                              </span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLineChange(item.key, 'quantity', Math.max(1, Number(item.quantity || 1) - 1))}
                            disabled={Number(item.quantity) <= 1}
                            className="size-7 rounded-md border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-xs font-bold text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Decrease quantity"
                          >
                            <i className="fa-solid fa-minus" />
                          </button>
                          <NumberInput
                            integer
                            min="1"
                            max={item.max_quantity || undefined}
                            value={item.quantity}
                            onChange={(e) => handleLineChange(item.key, 'quantity', e.target.value)}
                            className="w-14 text-center rounded-lg border border-border px-1 py-1 font-semibold text-sm"
                            aria-label={`Quantity for ${item.product_name}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleLineChange(item.key, 'quantity', Number(item.quantity || 1) + 1)}
                            disabled={Boolean(item.max_quantity && Number(item.quantity) >= Number(item.max_quantity))}
                            className="size-7 rounded-md border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-xs font-bold text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Increase quantity"
                          >
                            <i className="fa-solid fa-plus" />
                          </button>
                        </div>
                      </td>
                      <td>
                        <NumberInput
                          min="0"
                          placeholder="0"
                          value={item.unit_price}
                          onChange={(e) => handleLineChange(item.key, 'unit_price', e.target.value)}
                          className={cn(
                            'w-[6.5rem] rounded-lg border px-[0.55rem] py-[0.45rem] font-[inherit]',
                            (!item.unit_price || Number(item.unit_price) <= 0)
                              ? 'border-danger-text bg-danger-bg/20'
                              : 'border-border',
                          )}
                        />
                      </td>
                      <td className="font-semibold whitespace-nowrap">
                        ₹{calcLineTotal(item.quantity, Number(item.unit_price) || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[1rem] text-danger-text transition-colors hover:bg-danger-bg hover:text-danger-text"
                          onClick={() => setRemovingItem(item)}
                          title="Remove item"
                          aria-label={`Remove ${item.product_name || 'item'}`}
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-muted/50 font-bold text-text border-t-2 border-border">
                    <td className="text-text-secondary text-[0.78rem] uppercase font-bold tracking-wider">
                      Total ({form.line_items.length} {form.line_items.length === 1 ? 'product' : 'products'})
                    </td>
                    <td>
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold text-xs" title="Calculated total quantity (read-only)">
                        Total Qty: {form.total_quantity || 0}
                      </span>
                    </td>
                    <td className="text-text-muted text-xs">—</td>
                    <td className="font-bold whitespace-nowrap text-text">
                      ₹{Number(form.subtotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="mt-[0.85rem] mb-0 text-[0.85rem] text-text-secondary">No items added yet.</p>
          )}

          {fieldErrors.selected_products && (
            <p className="field-error">{fieldErrors.selected_products}</p>
          )}
        </div>

        {/* Financial Summary */}
        <div className="product-form-grid mt-1">
          <div className="form-field">
            <div className="flex items-center justify-between">
              <label htmlFor="total_quantity">Total Quantity</label>
              <span className="text-[0.7rem] font-medium text-text-muted">Auto-calculated</span>
            </div>
            <NumberInput
              id="total_quantity"
              name="total_quantity"
              value={form.total_quantity || '0'}
              readOnly
              className="input-readonly"
              title="Total product quantity (calculated automatically, read-only)"
            />
          </div>
          <div className="form-field">
            <div className="flex items-center justify-between">
              <label htmlFor="subtotal">Subtotal (₹)</label>
              <span className="text-[0.7rem] font-medium text-text-muted">Auto-calculated</span>
            </div>
            <NumberInput
              id="subtotal"
              name="subtotal"
              value={form.subtotal}
              readOnly
              className="input-readonly"
            />
          </div>
          {resolveEffectiveTaxRate(form.tax_rate) > 0 && (
            <div className="form-field">
              <div className="flex items-center justify-between">
                <label htmlFor="tax_amount">
                  Tax ({resolveEffectiveTaxRate(form.tax_rate)}%) (₹)
                </label>
                <span className="text-[0.7rem] font-medium text-text-muted">Auto-calculated</span>
              </div>
              <NumberInput
                id="tax_amount"
                name="tax_amount"
                value={form.tax_amount}
                readOnly
                className="input-readonly"
                title={`Tax calculated at ${resolveEffectiveTaxRate(form.tax_rate)}%`}
              />
            </div>
          )}
          <div className={fieldClass('sale_total')}>
            <label htmlFor="sale_total">
              Final Amount <span className="required">*</span>
            </label>
            <NumberInput
              id="sale_total"
              value={form.sale_total}
              readOnly
              className="input-readonly"
              aria-invalid={Boolean(fieldErrors.sale_total)}
            />
            {fieldErrors.sale_total && (
              <p className="field-error">{fieldErrors.sale_total}</p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="discount_amount">Discount (₹)</label>
            <NumberInput
              id="discount_amount"
              name="discount_amount"
              value={form.discount_amount || '0'}
              readOnly
              className="input-readonly"
              title="Discount is calculated as Final Amount - Paid Amount"
            />
          </div>
          <div className={fieldClass('paid_amount')}>
            <label htmlFor="paid_amount">Paid Amount (₹)</label>
            <NumberInput
              id="paid_amount"
              name="paid_amount"
              min="0"
              value={form.paid_amount}
              onChange={handleChange}
              placeholder="0"
              aria-invalid={Boolean(fieldErrors.paid_amount)}
            />
            {fieldErrors.paid_amount && (
              <p className="field-error">{fieldErrors.paid_amount}</p>
            )}
          </div>
        </div>

        <div className={`${fieldClass('notes')} form-field-full`}>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.notes}
            aria-invalid={Boolean(fieldErrors.notes)}
          />
          {fieldErrors.notes && <p className="field-error">{fieldErrors.notes}</p>}
        </div>

        {/* Actions */}
        <div className="product-form-actions">
          <Link to={path('/sales')} className="product-form-cancel">
            Cancel
          </Link>
          <button
            type="button"
            className="product-form-print"
            disabled={submitting}
            onClick={handleBillAction}
          >
            <i className="fa-solid fa-print mr-1.5" />
            {isEdit ? 'Update & Print Bill' : 'Save & Print Bill'}
          </button>
          <button type="submit" className="product-form-submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update Sale' : 'Create Sale'}
          </button>
        </div>
      </form>

      {/* Bill print preview component for in-browser printing */}
      <SaleBillPrint billNo={billNo} form={printForm} settings={settings} />

      <ProductInfoDialog
        product={viewingProduct}
        open={Boolean(viewingProduct)}
        onClose={() => setViewingProduct(null)}
      />

      <ConfirmDialog
        open={Boolean(removingItem)}
        title="Remove Item"
        message={`Are you sure you want to remove ${removingItem?.product_name || 'this item'} from the list?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (removingItem?.key) {
            handleRemoveLine(removingItem.key)
          }
        }}
        onCancel={() => setRemovingItem(null)}
      />

      <UsageLimitModal
        open={Boolean(usageLimitData)}
        onClose={() => setUsageLimitData(null)}
        limitData={usageLimitData}
        tenantSlug={tenant?.slug}
      />
    </div>
  )
}

export default SaleFormPage


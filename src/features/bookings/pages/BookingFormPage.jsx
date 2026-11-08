import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createBooking,
  fetchBookingById,
  fetchNextBillNo,
  updateBooking,
} from '@/features/bookings/api/bookings'
import ProductSearchSelect, {
  isProductUnavailable,
  productAvailableQuantity,
} from '@/features/products/components/ProductSearchSelect'
import { fetchProductById } from '@/features/products/api/products'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import { fetchSettings } from '@/features/settings/api/settings'
import BookingBillPrint from '@/features/bookings/components/BookingBillPrint'
import { printBill } from '@/shared/utils/printBill'
import AccessoriesFields from '@/shared/components/AccessoriesFields'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { Dialog } from '@/shared/components/Dialog'
import { DateTimeLocalInput } from '@/shared/components/DateInput'
import { revealFormErrors, handleFormApiError } from '@/shared/utils/formErrors'
import { UsageLimitModal } from '@/shared/components/UsageLimitModal'
import { FormErrorAlert } from '@/shared/components/FormErrorAlert'
import {
  EMPTY_BOOKING_FORM,
  fromDatetimeLocalValue,
  getDefaultPickupDatetime,
  getDefaultReturnDatetime,
  getDatetimeDayAfterTomorrow,
  getDatetimeLocalMax,
  getDatetimeLocalNow,
  getDatetimeTomorrow,
  isBookingLocked,
  sanitizeDatetimeLocalValue,
  toDatetimeLocalValue,
  validateBookingForm,
} from '@/features/bookings/constants/bookings'
import {
  calcBookingAmounts,
  calcLineTotal,
  calcRentalDaysFromDates,
  calcTotalQuantity,
  createLineItem,
  deriveAmountsFromOverrides,
  formatItemAccessories,
  itemHasAccessories,
  normalizeLineItem,
  normalizeRentalDays,
  parseSelectedProducts,
  serializeLineItems,
} from '@/features/bookings/utils/bookingLineItems'
import { hasDisplayValue } from '@/shared/utils/displayValue'
import { useTenant } from '@/shared/tenant/TenantContext'
import NumberInput from '@/shared/components/NumberInput'
import { cn } from '@/shared/utils/cn'
import { applyFieldLimit, FIELD_LIMITS } from '@/shared/constants/fieldLimits'

function formatMoneyInput(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return String(num)
}

function bookingToForm(booking) {
  const text = (value) => (hasDisplayValue(value) ? String(value) : '')
  let items = []
  let legacyText = ''
  let parsedDays = null

  if (Array.isArray(booking.items) && booking.items.length > 0) {
    const bookingAccessories = {
      choyani: text(booking.choyani),
      pant: text(booking.pant ?? booking.pent),
      sol: text(booking.sol),
      mojdi: text(booking.mojdi ?? booking.shoe),
      other_items: '',
    }
    const bookingHasAccessories = Object.values(bookingAccessories).some(Boolean)
    let inheritedBookingAccessories = false

    items = booking.items.map((it) => {
      const prod = it.product || {}
      const totalStock = Number(prod.total_quantity ?? prod.quantity ?? 0)
      const damaged = Number(prod.damaged_quantity ?? 0)
      const usable = Math.max(0, totalStock - damaged)
      const rawPrice = Number(it.unit_rent ?? it.unit_price)
      const unitPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0
      const itemAcc = (it.accessories && typeof it.accessories === 'object') ? it.accessories : {}
      const ownAccessories = {
        choyani: text(it.choyani ?? itemAcc.choyani),
        pant: text(it.pant ?? it.pent ?? itemAcc.pant),
        sol: text(it.sol ?? itemAcc.sol),
        mojdi: text(it.mojdi ?? it.shoe ?? itemAcc.mojdi),
        other_items: text(it.other_items ?? itemAcc.other_items ?? itemAcc.otherItems),
      }
      const hasOwnAccessories = Object.values(ownAccessories).some(Boolean)
      let accessories = ownAccessories
      if (!hasOwnAccessories && bookingHasAccessories && !inheritedBookingAccessories) {
        accessories = bookingAccessories
        inheritedBookingAccessories = true
      }

      return {
        key: `item-${it.id || it.product_id}`,
        product_id: it.product_id,
        product_name: prod.product_name || it.product_name || `Product #${it.product_id}`,
        product_code: prod.product_code || null,
        quantity: it.quantity,
        max_quantity: usable > 0 ? usable : Number(it.quantity) || 1,
        unit_price: unitPrice,
        line_total: it.total_amount || (Number(it.quantity) || 1) * unitPrice,
        image: prod.image || it.image || it.image_url || null,
        image_url: prod.image || it.image || it.image_url || null,
        product: prod,
        ...accessories,
      }
    })
  } else {
    const parsed = parseSelectedProducts(booking.selected_products)
    items = parsed.items
    legacyText = parsed.legacyText
    parsedDays = parsed.rentalDays
  }

  const calculationMode = booking.rental_day_calculation_mode || 'DIFF_2_DAYS'
  const pickupVal = booking.pickup_date || booking.use_date
  const pickupDate = pickupVal ? toDatetimeLocalValue(pickupVal) : ''
  const returnDate = booking.return_date ? toDatetimeLocalValue(booking.return_date) : ''
  const storedRentalDays =
    booking.rental_days != null && booking.rental_days !== ''
      ? normalizeRentalDays(booking.rental_days)
      : null
  const calculatedRentalDays =
    pickupDate && returnDate
      ? calcRentalDaysFromDates(
          pickupDate,
          returnDate,
          calculationMode,
        )
      : null
  const rentalDays = storedRentalDays ?? calculatedRentalDays ?? parsedDays ?? 1

  return {
    bill_no: text(booking.bill_no),
    customer_name: text(booking.customer_name),
    phone_number: text(booking.phone_number),
    extra_phone_number: text(booking.extra_phone_number),
    village_address: text(booking.village_address),
    status: booking.status ?? 'booked',
    created_at: booking.created_at || null,
    choyani: text(booking.choyani),
    mojdi: text(booking.mojdi ?? booking.shoe),
    pant: text(booking.pant ?? booking.pent),
    sol: text(booking.sol),
    accessories_price: booking.accessories_price ?? '',
    pickup_date: pickupDate,
    use_date: pickupDate,
    return_date: returnDate,
    rental_days: String(rentalDays),
    rental_day_calculation_mode: calculationMode,
    selected_products: text(booking.selected_products),
    line_items: items,
    total_quantity: String(calcTotalQuantity(items)),
    legacy_products: legacyText,
    subtotal: booking.subtotal ?? '',
    discount_amount: booking.discount_amount ?? '',
    tax_rate: booking.tax_rate ?? '',
    tax_amount: booking.tax_amount ?? '',
    security_deposit: booking.security_deposit ?? '',
    deposit_paid:
      booking.deposit_paid === true ||
      booking.deposit_paid === 'true' ||
      booking.depositPaid === true ||
      booking.depositPaid === 'true' ||
      Number(booking.deposit_collected) > 0,
    payment_method: 'CASH',
    rental_total: booking.rental_total ?? '',
    paid_amount: booking.paid_amount ?? '',
    due_amount: booking.due_amount ?? '',
    notes: text(booking.notes),
  }
}

function BookingFormPage() {
  const { path, tenant } = useTenant()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(() => {
    const defaultPickupDate = getDatetimeTomorrow(10, 0)
    const defaultReturnDate = getDatetimeDayAfterTomorrow(11, 0)
    const defaultRentalDays = String(
      calcRentalDaysFromDates(
        defaultPickupDate,
        defaultReturnDate,
        'DIFF_2_DAYS',
      ),
    )
    return {
      ...EMPTY_BOOKING_FORM,
      pickup_date: defaultPickupDate,
      use_date: defaultPickupDate,
      return_date: defaultReturnDate,
      rental_days: defaultRentalDays,
      rental_day_calculation_mode: 'DIFF_2_DAYS',
      line_items: [],
      total_quantity: '0',
      legacy_products: '',
    }
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [nextBillNo, setNextBillNo] = useState('')
  const [settings, setSettings] = useState(null)
  const [productId, setProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(true)
  const [removingItem, setRemovingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [usageLimitData, setUsageLimitData] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [accessoriesItemKey, setAccessoriesItemKey] = useState(null)
  const datetimeMax = useMemo(() => getDatetimeLocalMax(2050), [])
  const [nowLocal, setNowLocal] = useState(() => getDatetimeLocalNow())
  const lineItemsRef = useRef(form.line_items)
  const selectedProductIdRef = useRef(selectedProduct?.id)
  lineItemsRef.current = form.line_items
  selectedProductIdRef.current = selectedProduct?.id
  const hasRentalDates = Boolean(
    form.pickup_date &&
    form.return_date &&
    !fieldErrors.pickup_date &&
    !fieldErrors.pickup_time &&
    !fieldErrors.return_date &&
    new Date(form.return_date) >= new Date(form.pickup_date)
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setNowLocal(getDatetimeLocalNow())
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  const pickupDateMin =
    isEdit && form.pickup_date && form.pickup_date < nowLocal
      ? form.pickup_date
      : nowLocal
  const useDateMin =
    form.pickup_date || (isEdit && form.use_date && form.use_date < nowLocal ? form.use_date : nowLocal)
  const returnDateMin = form.use_date || form.pickup_date || useDateMin
  const billNo = isEdit ? form.bill_no : nextBillNo
  const accessoriesItem =
    form.line_items.find((item) => item.key === accessoriesItemKey) || null

  const syncTotals = (
    lineItems,
    {
      paidAmount = 0,
      discountAmount = 0,
      taxRate = 0,
      rentalDays = 1,
      accessoriesPrice = 0,
      securityDeposit = 0,
    } = {},
  ) => {
    const amounts = calcBookingAmounts({
      items: lineItems,
      rentalDays,
      discountAmount,
      taxRate,
      accessoriesPrice,
      securityDeposit,
      paidAmount,
    })

    return {
      line_items: lineItems,
      selected_products: serializeLineItems(lineItems, amounts.rental_days),
      total_quantity: String(amounts.total_quantity || 0),
      rental_days: String(amounts.rental_days),
      accessories_price: formatMoneyInput(amounts.accessories_price),
      subtotal: formatMoneyInput(amounts.products_subtotal),
      discount_amount: formatMoneyInput(amounts.discount_amount),
      tax_rate: formatMoneyInput(amounts.tax_rate),
      tax_amount: formatMoneyInput(amounts.tax_amount),
      security_deposit: formatMoneyInput(amounts.security_deposit),
      rental_total: formatMoneyInput(amounts.rental_total),
      due_amount: formatMoneyInput(amounts.due_amount),
    }
  }

  const applyAmountOverrides = ({
    subtotal,
    discountAmount,
    taxAmount,
    accessoriesPrice,
    securityDeposit,
    paidAmount,
  }) => {
    const amounts = deriveAmountsFromOverrides({
      subtotal,
      discountAmount,
      taxAmount,
      accessoriesPrice,
      securityDeposit,
      paidAmount,
    })

    return {
      subtotal: formatMoneyInput(amounts.subtotal),
      accessories_price: formatMoneyInput(amounts.accessories_price),
      discount_amount: formatMoneyInput(amounts.discount_amount),
      tax_amount: formatMoneyInput(amounts.tax_amount),
      security_deposit: formatMoneyInput(amounts.security_deposit),
      rental_total: formatMoneyInput(amounts.rental_total),
      due_amount: formatMoneyInput(amounts.due_amount),
    }
  }

  const resolveTaxRate = (override) => {
    const companyRate = Number(settings?.tax_rate) || 0
    // New bookings always use company profile tax. Edits strictly keep the saved booking rate.
    if (!isEdit) return companyRate
    if (override !== undefined && override !== null && override !== '') {
      return Number(override) || 0
    }
    return 0
  }

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [billResult, bookingResult, settingsResult] = await Promise.all([
          !isEdit ? fetchNextBillNo().catch(() => null) : null,
          isEdit ? fetchBookingById(id).catch(() => null) : null,
          fetchSettings().catch(() => null),
        ])

        if (cancelled) return

        const nextSettings = settingsResult?.data ?? settingsResult
        if (nextSettings) setSettings(nextSettings)
        const companyTaxRate = Number(nextSettings?.tax_rate) || 0
        const shopCalculationMode = nextSettings?.rental_day_calculation_mode || 'DIFF_2_DAYS'

        if (!isEdit) {
          const defaultPickupDate = getDefaultPickupDatetime()
          const defaultReturnDate = getDefaultReturnDatetime(defaultPickupDate)
          const defaultRentalDays = String(
            calcRentalDaysFromDates(
              defaultPickupDate,
              defaultReturnDate,
              shopCalculationMode,
            ),
          )
          const resolvedBillNo =
            billResult?.data?.bill_no ||
            billResult?.bill_no ||
            billResult?.data ||
            `B-${Date.now().toString().slice(-6)}`
          setNextBillNo(resolvedBillNo)
          setForm({
            ...EMPTY_BOOKING_FORM,
            bill_no: resolvedBillNo,
            pickup_date: defaultPickupDate,
            use_date: defaultPickupDate,
            return_date: defaultReturnDate,
            rental_days: defaultRentalDays,
            rental_day_calculation_mode: shopCalculationMode,
            line_items: [],
            legacy_products: '',
            ...syncTotals([], { taxRate: companyTaxRate, rentalDays: defaultRentalDays }),
          })
          setProductId('')
          setSelectedProduct(null)
          setQuantity('1')
          setFieldErrors({})
          setAccessoriesItemKey(null)
          setRemovingItem(null)
          setViewingProduct(null)
        }

        const targetBooking = bookingResult || (isEdit && location.state?.booking ? location.state.booking : null)

        if (isEdit && targetBooking) {
          if (isBookingLocked(targetBooking.status, targetBooking)) {
            toast.error('Active, overdue, or completed bookings cannot be edited.')
            navigate(path('/booking'), { replace: true })
            return
          }

          const nextForm = bookingToForm(targetBooking)
          const preservedDepositPaid = Boolean(nextForm.deposit_paid)
          if (nextForm.line_items.length) {
            Object.assign(
              nextForm,
              syncTotals(nextForm.line_items, {
                paidAmount: nextForm.paid_amount,
                discountAmount: nextForm.discount_amount,
                taxRate:
                  targetBooking.tax_rate !== undefined && targetBooking.tax_rate !== null
                    ? Number(targetBooking.tax_rate)
                    : targetBooking.taxRate !== undefined && targetBooking.taxRate !== null
                      ? Number(targetBooking.taxRate)
                      : Number(nextForm.tax_rate) || 0,
                rentalDays: nextForm.rental_days,
                accessoriesPrice: nextForm.accessories_price,
                securityDeposit: nextForm.security_deposit,
              }),
            )
          } else {
            Object.assign(
              nextForm,
              applyAmountOverrides({
                subtotal: nextForm.subtotal || nextForm.rental_total || '0',
                discountAmount: nextForm.discount_amount || '0',
                taxAmount: nextForm.tax_amount || '0',
                accessoriesPrice: nextForm.accessories_price || '0',
                securityDeposit: nextForm.security_deposit || '0',
                paidAmount: nextForm.paid_amount || '0',
              }),
            )
          }
          nextForm.deposit_paid = preservedDepositPaid
          setForm(nextForm)
        } else if (isEdit && !targetBooking) {
          setError('Booking not found or could not be loaded.')
          toast.error('Could not load booking details.')
        }

        if (location.state?.rebookFrom) {
          const source = location.state.rebookFrom
          const defaultPickupDate = getDefaultPickupDatetime()
          const defaultReturnDate = getDefaultReturnDatetime(defaultPickupDate)
          const defaultRentalDays = String(
            calcRentalDaysFromDates(
              defaultPickupDate,
              defaultReturnDate,
              shopCalculationMode,
            ),
          )

          setForm((prev) => {
            const rebookForm = {
              ...prev,
              customer_name: source.customer_name || '',
              phone_number: source.phone_number || '',
              extra_phone_number: source.extra_phone_number || '',
              village_address: source.village_address || '',
              pickup_date: defaultPickupDate,
              use_date: defaultPickupDate,
              return_date: defaultReturnDate,
              rental_days: defaultRentalDays,
              rental_day_calculation_mode: shopCalculationMode,
            }
            return rebookForm
          })
        }

        if (location.state?.prefillProduct) {
          const prefill = location.state.prefillProduct
          const pickup = location.state.prefillPickup || getDefaultPickupDatetime()
          const ret = location.state.prefillReturn || getDefaultReturnDatetime(pickup)
          const days = String(calcRentalDaysFromDates(pickup, ret, shopCalculationMode))

          setForm((prev) => {
            const nextItem = {
              key: `line-${Date.now()}`,
              product_id: String(prefill.id),
              product_name: prefill.product_name,
              product_code: prefill.product_code || '',
              quantity: 1,
              unit_price: Number(prefill.daily_rent || 0),
              rental_days: days,
              line_total: Number(prefill.daily_rent || 0) * Number(days || 1),
              choyani: '',
              pant: '',
              sol: '',
              mojdi: '',
              other_items: '',
            }
            return {
              ...prev,
              pickup_date: pickup,
              use_date: pickup,
              return_date: ret,
              rental_days: days,
              line_items: [nextItem],
              ...syncTotals([nextItem], {
                taxRate: companyTaxRate,
                rentalDays: days,
              }),
            }
          })
          setProductId(String(prefill.id))
          setSelectedProduct(prefill)
        }
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load booking form data')
        toast.error('Could not load booking details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [id, isEdit, location.state, navigate, path])

  useEffect(() => {
    if (!form.pickup_date || !form.return_date) return undefined

    const pickupDate = fromDatetimeLocalValue(form.pickup_date)
    const returnDate = fromDatetimeLocalValue(form.return_date)
    if (!pickupDate || !returnDate) return undefined

    let cancelled = false

    const refreshAvailability = async () => {
      const ids = new Set(
        lineItemsRef.current
          .map((item) => item.product_id)
          .filter((productIdValue) => productIdValue != null && productIdValue !== '')
          .map(String),
      )
      if (selectedProductIdRef.current) ids.add(String(selectedProductIdRef.current))
      if (ids.size === 0) return

      try {
        const products = await Promise.all(
          [...ids].map((productIdValue) =>
            fetchProductById(productIdValue, {
              pickup_date: pickupDate,
              return_date: returnDate,
              exclude_booking_id: isEdit ? id : undefined,
            }),
          ),
        )

        if (cancelled) return

        const byId = {}
        for (const product of products) {
          if (product) byId[String(product.id)] = product
        }

        if (selectedProductIdRef.current && byId[String(selectedProductIdRef.current)]) {
          setSelectedProduct(byId[String(selectedProductIdRef.current)])
        }

        setForm((prev) => {
          if (!prev.line_items.length) return prev

          let changed = false
          const nextItems = prev.line_items.map((item) => {
            const product = byId[String(item.product_id)]
            if (!product) return item
            const backendAvailable = productAvailableQuantity(product)
            const currentQty = Number(item.quantity) || 1
            const maxQty = isEdit ? Math.max(backendAvailable, currentQty) : backendAvailable
            const qty = maxQty > 0 ? Math.min(currentQty, maxQty) : currentQty
            if (qty === currentQty && Number(item.max_quantity) === maxQty) return item
            changed = true
            return normalizeLineItem({
              ...item,
              quantity: qty,
              max_quantity: maxQty,
            })
          })

          if (!changed) return prev

          return {
            ...prev,
            ...syncTotals(nextItems, {
              paidAmount: prev.paid_amount,
              discountAmount: prev.discount_amount,
              taxRate: resolveTaxRate(prev.tax_rate),
              rentalDays: prev.rental_days,
              accessoriesPrice: prev.accessories_price,
              securityDeposit: prev.security_deposit,
            }),
          }
        })
      } catch {
        // Keep existing quantities if availability cannot be refreshed.
      }
    }

    refreshAvailability()
    return () => {
      cancelled = true
    }
  }, [form.pickup_date, form.return_date, id, isEdit])

  const handleViewProduct = async (productId) => {
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

    if (name === 'phone_number' || name === 'extra_phone_number') {
      nextValue = value.replace(/\D/g, '').slice(0, 10)
    }

    if (name === 'pickup_date' || name === 'return_date') {
      nextValue = sanitizeDatetimeLocalValue(value, {
        min: name === 'pickup_date' ? pickupDateMin : returnDateMin,
        max: datetimeMax,
      })
    }

    if (name === 'rental_days') {
      nextValue = value.replace(/\D/g, '').slice(0, 4)
    }

    setForm((prev) => {
      const next = { ...prev, [name]: nextValue }
      const mode =
        next.rental_day_calculation_mode ||
        settings?.rental_day_calculation_mode ||
        'DIFF_2_DAYS'

      if (name === 'pickup_date' && nextValue) {
        next.use_date = nextValue
        const pDate = new Date(nextValue)
        if (!Number.isNaN(pDate.getTime())) {
          const currentRet = prev.return_date ? new Date(prev.return_date) : null
          if (!currentRet || Number.isNaN(currentRet.getTime()) || currentRet < pDate) {
            const nextRet = new Date(pDate)
            nextRet.setDate(nextRet.getDate() + 1)
            next.return_date = toDatetimeLocalValue(nextRet)
          }
        }
      }

      if (name === 'pickup_date' || name === 'return_date') {
        const pickupDate = name === 'pickup_date' ? nextValue : next.pickup_date
        const returnDate = name === 'return_date' ? nextValue : next.return_date
        if (pickupDate && returnDate) {
          const nextCalendarDays = calcRentalDaysFromDates(pickupDate, returnDate, mode)
          const hadBothDates = Boolean(prev.pickup_date && prev.return_date)
          const previousCalendarDays = hadBothDates
            ? calcRentalDaysFromDates(prev.pickup_date, prev.return_date, mode)
            : null
          const currentDays = Math.trunc(Number(prev.rental_days))
          const followsCalendar =
            prev.rental_days === '' ||
            previousCalendarDays == null ||
            (Number.isFinite(currentDays) && currentDays === previousCalendarDays)

          if (followsCalendar) {
            next.rental_days = String(nextCalendarDays)
          }
        }
      }

      if (name === 'paid_amount' || name === 'discount_amount' || name === 'security_deposit') {
        Object.assign(
          next,
          syncTotals(prev.line_items, {
            paidAmount: name === 'paid_amount' ? nextValue : prev.paid_amount,
            discountAmount: name === 'discount_amount' ? nextValue : prev.discount_amount,
            taxRate: resolveTaxRate(prev.tax_rate),
            rentalDays: prev.rental_days,
            accessoriesPrice: prev.accessories_price,
            securityDeposit:
              name === 'security_deposit' ? nextValue : prev.security_deposit,
          }),
        )
        next[name] = nextValue
      }

      if (
        name === 'rental_days' ||
        name === 'pickup_date' ||
        name === 'return_date' ||
        name === 'accessories_price'
      ) {
        Object.assign(
          next,
          syncTotals(prev.line_items, {
            paidAmount: prev.paid_amount,
            discountAmount: prev.discount_amount,
            taxRate: resolveTaxRate(prev.tax_rate),
            rentalDays:
              name === 'rental_days'
                ? nextValue
                : name === 'pickup_date' || name === 'return_date'
                  ? next.rental_days
                  : prev.rental_days,
            accessoriesPrice:
              name === 'accessories_price' ? nextValue : prev.accessories_price,
            securityDeposit: prev.security_deposit,
          }),
        )
        if (name === 'rental_days') next.rental_days = nextValue
        if (name === 'accessories_price') next.accessories_price = nextValue
      }

      if (name === 'security_deposit' && (Number(nextValue) <= 0 || !nextValue)) {
        next.deposit_paid = false
      }

      return next
    })

    clearFieldError(name)
    if (name === 'pickup_date') {
      clearFieldError('pickup_time')
      clearFieldError('return_date')
    }
    if (name === 'paid_amount') clearFieldError('paid_amount')
    if (name === 'security_deposit') clearFieldError('security_deposit')
    if (name === 'discount_amount') clearFieldError('discount_amount')
    if (name === 'security_deposit') clearFieldError('security_deposit')
    if (name === 'rental_days') clearFieldError('rental_days')
    if (name === 'subtotal') clearFieldError('subtotal')
    if (name === 'tax_amount') clearFieldError('tax_amount')
    if (name === 'accessories_price') clearFieldError('accessories_price')
  }

  const handleAccessoryChange = (event) => {
    const { name, value } = event.target
    const nextValue = applyFieldLimit(name, value)
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item) =>
        item.key === accessoriesItemKey ? { ...item, [name]: nextValue } : item,
      ),
    }))
  }

  const applyCalendarRentalDays = () => {
    const mode =
      form.rental_day_calculation_mode ||
      settings?.rental_day_calculation_mode ||
      'DIFF_2_DAYS'
    if (!form.pickup_date || !form.return_date) return
    const days = String(calcRentalDaysFromDates(form.pickup_date, form.return_date, mode))
    setForm((prev) => ({
      ...prev,
      ...syncTotals(prev.line_items, {
        paidAmount: prev.paid_amount,
        discountAmount: prev.discount_amount,
        taxRate: resolveTaxRate(prev.tax_rate),
        rentalDays: days,
        accessoriesPrice: prev.accessories_price,
        securityDeposit: prev.security_deposit,
      }),
    }))
    clearFieldError('rental_days')
  }

  const handleProductChange = (event) => {
    setProductId(event.target.value)
    setSelectedProduct(event.product ?? null)
    clearFieldError('selected_products')
  }

  const handleAddProduct = () => {
    if (!hasRentalDates) {
      toast.error('Please enter use and return dates first.')
      return
    }

    if (!selectedProduct) {
      toast.error('Please select a product to add.')
      return
    }

    const priceRaw = selectedProduct.daily_rent
    const unitPrice = Number.isFinite(Number(priceRaw)) && Number(priceRaw) >= 0 ? Number(priceRaw) : 0

    if (isProductUnavailable(selectedProduct)) {
      toast.error('This product is not available for rental.')
      return
    }

    const available = productAvailableQuantity(selectedProduct)
    const qty = Math.max(1, Number(quantity) || 1)

    if (available <= 0) {
      toast.error('This product is out of stock for the selected dates.')
      return
    }

    if (qty > available) {
      toast.error(`Only ${available} available for the selected dates.`)
      return
    }

    const existingIndex = form.line_items.findIndex(
      (item) => String(item.product_id) === String(selectedProduct.id),
    )

    let nextItems
    if (existingIndex >= 0) {
      const existing = form.line_items[existingIndex]
      const currentQty = Number(existing.quantity) || 1
      const newQty = currentQty + qty

      if (newQty > available) {
        toast.error(`Cannot add ${qty} more. Total requested (${newQty}) exceeds available (${available}).`)
        return
      }

      nextItems = form.line_items.map((item, index) =>
        index === existingIndex
          ? normalizeLineItem({
              ...item,
              quantity: newQty,
              max_quantity: available,
            })
          : item,
      )
    } else {
      const newItem = createLineItem(selectedProduct, qty)
      newItem.max_quantity = available
      nextItems = [...form.line_items, newItem]
    }

    setForm((prev) => ({
      ...prev,
      ...syncTotals(nextItems, {
        paidAmount: prev.paid_amount,
        discountAmount: prev.discount_amount,
        taxRate: resolveTaxRate(prev.tax_rate),
        rentalDays: prev.rental_days,
        accessoriesPrice: prev.accessories_price,
        securityDeposit: prev.security_deposit,
      }),
    }))

    setProductId('')
    setSelectedProduct(null)
    setQuantity('1')
    clearFieldError('selected_products')
  }

  const handleLineChange = (key, field, value) => {
    setForm((prev) => {
      const nextItems = prev.line_items.map((item) => {
        if (item.key !== key) return item

        if (field === 'quantity') {
          const qty = Math.max(1, Math.trunc(Number(value) || 1))
          const max = Number(item.max_quantity)
          const clampedQty = Number.isFinite(max) && max > 0 ? Math.min(qty, max) : qty
          return normalizeLineItem({
            ...item,
            quantity: clampedQty,
            max_quantity: item.max_quantity,
          })
        }

        if (field === 'unit_price') {
          return {
            ...item,
            unit_price: value,
          }
        }

        return item
      })

      return {
        ...prev,
        ...syncTotals(nextItems, {
          paidAmount: prev.paid_amount,
          discountAmount: prev.discount_amount,
          taxRate: resolveTaxRate(prev.tax_rate),
          rentalDays: prev.rental_days,
          accessoriesPrice: prev.accessories_price,
          securityDeposit: prev.security_deposit,
        }),
      }
    })
    const hasInvalidPrice = form.line_items.some(
      (it) => it.unit_price === '' || !Number.isFinite(Number(it.unit_price)) || Number(it.unit_price) <= 0
    )
    if (hasInvalidPrice) {
      setFieldErrors((prev) => ({ ...prev, selected_products: 'Rental price must be greater than 0' }))
    } else {
      clearFieldError('selected_products')
    }
    clearFieldError('rental_total')
  }

  const handleRemoveLine = (key) => {
    setForm((prev) => {
      const nextItems = prev.line_items.filter((item) => item.key !== key)
      return {
        ...prev,
        ...syncTotals(nextItems, {
          paidAmount: prev.paid_amount,
          discountAmount: prev.discount_amount,
          taxRate: resolveTaxRate(prev.tax_rate),
          rentalDays: prev.rental_days,
          accessoriesPrice: prev.accessories_price,
          securityDeposit: prev.security_deposit,
        }),
      }
    })
    clearFieldError('selected_products')
  }

  const buildPayload = () => {
    const lineItems = form.line_items.map(normalizeLineItem)
    const rentalDays = normalizeRentalDays(form.rental_days)
    const taxRate = resolveTaxRate(form.tax_rate)
    const amounts = lineItems.length
      ? calcBookingAmounts({
          items: lineItems,
          rentalDays,
          discountAmount: form.discount_amount,
          taxRate,
          accessoriesPrice: form.accessories_price,
          securityDeposit: form.security_deposit,
          paidAmount: form.paid_amount,
        })
      : deriveAmountsFromOverrides({
          subtotal: form.subtotal,
          discountAmount: form.discount_amount,
          taxAmount: formatMoneyInput(
            ((Math.max(0, Number(form.subtotal) || 0) -
              Math.min(
                Math.max(0, Number(form.discount_amount) || 0),
                Math.max(0, Number(form.subtotal) || 0),
              )) *
              taxRate) /
              100,
          ),
          accessoriesPrice: form.accessories_price,
          securityDeposit: form.security_deposit,
          paidAmount: form.paid_amount,
        })
    const selectedProducts = lineItems.length
      ? serializeLineItems(lineItems, rentalDays)
      : form.legacy_products?.trim() || null

    const items = lineItems.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity) || 1,
      unit_rent: Number(item.unit_price) || 0,
      rental_days: rentalDays,
      total_amount:
        (Number(item.quantity) || 1) * (Number(item.unit_price) || 0) * (Number(rentalDays) || 1),
      rent_type: 'daily',
      choyani: String(item.choyani ?? '').trim() || null,
      pant: String(item.pant ?? '').trim() || null,
      sol: String(item.sol ?? '').trim() || null,
      mojdi: String(item.mojdi ?? '').trim() || null,
      other_items: String(item.other_items ?? '').trim() || null,
      accessories: {
        choyani: String(item.choyani ?? '').trim() || null,
        pant: String(item.pant ?? '').trim() || null,
        sol: String(item.sol ?? '').trim() || null,
        mojdi: String(item.mojdi ?? '').trim() || null,
        other_items: String(item.other_items ?? '').trim() || null,
      },
    }))

    const payload = {
      customer_name: form.customer_name.trim(),
      phone_number: form.phone_number.trim(),
      extra_phone_number: form.extra_phone_number.trim() || null,
      village_address: form.village_address.trim() || null,
      choyani: null,
      mojdi: null,
      pant: null,
      sol: null,
      pickup_date: fromDatetimeLocalValue(form.pickup_date),
      use_date: fromDatetimeLocalValue(form.pickup_date),
      return_date: fromDatetimeLocalValue(form.return_date),
      rental_days: rentalDays,
      rental_day_calculation_mode:
        form.rental_day_calculation_mode ||
        settings?.rental_day_calculation_mode ||
        'DIFF_2_DAYS',
      selected_products: selectedProducts,
      items,
      discount_amount: amounts.discount_amount,
      tax_rate: taxRate,
      tax_amount: amounts.tax_amount,
      accessories_price: amounts.accessories_price,
      security_deposit: amounts.security_deposit,
      deposit_paid: Boolean(form.deposit_paid),
      payment_method: form.payment_method || 'CASH',
      rental_total: amounts.rental_total,
      paid_amount: amounts.paid_amount,
      due_amount: amounts.due_amount,
      notes: form.notes.trim() || null,
    }

    if (!isEdit) {
      payload.status = 'booked'
    }

    return payload
  }

  const validationForm = {
    ...form,
    selected_products:
      form.line_items.length > 0
        ? serializeLineItems(form.line_items)
        : form.selected_products,
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (isEdit && isBookingLocked(form.status, form)) {
      setError('Active, overdue, or completed bookings cannot be edited.')
      toast.error('Active, overdue, or completed bookings cannot be edited.')
      return
    }

    const errors = validateBookingForm(validationForm, {
      requireFutureUseDate: !isEdit,
      isCreate: !isEdit,
    })
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields and try again.')
      revealFormErrors(errors, {
        message: 'Please fix the highlighted fields and try again.',
        fieldIds: { selected_products: 'add_product', pickup_time: 'pickup_date-time' },
      })
      return
    }

    setSubmitting(true)

    try {
      const payload = buildPayload()

      if (isEdit) {
        await updateBooking(id, payload)
      } else {
        await createBooking(payload)
      }

      const notice = isEdit
        ? 'Booking updated successfully'
        : 'Booking created successfully'

      navigate(path('/booking'), { state: { notice } })
    } catch (err) {
      handleFormApiError(err, {
        setFieldErrors,
        setFormError: setError,
        onUsageLimit: (limitInfo) => setUsageLimitData(limitInfo),
        fieldIds: {
          customer_name: 'customer_name',
          phone_number: 'phone_number',
          pickup_date: 'pickup_date',
          return_date: 'return_date',
          selected_products: 'add_product',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleBillAction = async () => {
    setError(null)

    if (isEdit && isBookingLocked(form.status)) {
      setError('Returned or cancelled bookings cannot be edited.')
      toast.error('Returned or cancelled bookings cannot be edited.')
      return
    }

    const errors = validateBookingForm(validationForm, {
      requireFutureUseDate: !isEdit,
      isCreate: !isEdit,
    })
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError('Please fill required fields before saving and printing.')
      revealFormErrors(errors, {
        message: 'Please fill required fields before saving and printing.',
        fieldIds: { selected_products: 'add_product', pickup_time: 'pickup_date-time' },
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = buildPayload()
      let currentBillNo = billNo
      let savedBooking = null

      if (isEdit) {
        const response = await updateBooking(id, payload)
        savedBooking = response?.data || response
      } else {
        const response = await createBooking(payload)
        savedBooking = response?.data || response
        if (savedBooking?.bill_no) currentBillNo = savedBooking.bill_no
      }

      const notice = isEdit
        ? 'Booking updated successfully'
        : 'Booking created successfully'

      const bookingForPrint = {
        ...payload,
        ...(savedBooking || {}),
        items: (Array.isArray(savedBooking?.items) && savedBooking.items.length > 0)
          ? savedBooking.items
          : payload.items,
        line_items: form.line_items.map((it) => ({
          ...it,
          rental_days: normalizeRentalDays(form.rental_days),
          line_total: calcLineTotal(it.quantity, it.unit_price, normalizeRentalDays(form.rental_days)),
        })),
        selected_products: payload.selected_products,
        bill_no: savedBooking?.bill_no || currentBillNo,
        id: savedBooking?.id || id,
      }

      navigate(path('/booking'), {
        state: {
          notice,
          autoPrintBooking: savedBooking ? bookingForPrint : null,
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
          pickup_date: 'pickup_date',
          return_date: 'return_date',
          selected_products: 'add_product',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (name) =>
    `form-field${fieldErrors[name] ? ' has-error' : ''}`

  const rentalDays = normalizeRentalDays(form.rental_days)
  const printForm = {
    ...form,
    rental_days: rentalDays,
    deposit_collected: form.deposit_paid ? Number(form.security_deposit || 0) : 0,
    selected_products:
      form.line_items.length > 0
        ? serializeLineItems(form.line_items, rentalDays)
        : form.legacy_products || form.selected_products,
    line_items: form.line_items.map((it) => ({
      ...it,
      rental_days: rentalDays,
      line_total: calcLineTotal(it.quantity, it.unit_price, rentalDays),
    })),
  }

  if (loading) {
    return <div className="product-form-loading">Loading booking...</div>
  }

  return (
    <div className="product-form-page">
      <div className="product-form-header page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Rentals</p>
          <h1 className="page-title">{isEdit ? 'Edit Booking' : 'New Rental'}</h1>
        </div>
        <div className="product-form-header-aside">
          <p className="booking-bill-no">
            <span className="booking-bill-no-value">
              Bill No: {billNo || (isEdit ? '—' : 'Loading...')}
            </span>
          </p>
          <Link to={path("/booking")} className="product-form-back">
            Back to Bookings
          </Link>
        </div>
      </div>

      <FormErrorAlert message={error} onDismiss={() => setError(null)} />

      <form className="product-form" onSubmit={handleSubmit} noValidate>
        <div className="product-form-grid">
          <div className={fieldClass('customer_name')}>
            <label htmlFor="customer_name">Customer Name <span className="required">*</span></label>
            <input
              id="customer_name"
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              maxLength={FIELD_LIMITS.customer_name}
              aria-invalid={Boolean(fieldErrors.customer_name)}
            />
            {fieldErrors.customer_name && (
              <p className="field-error">{fieldErrors.customer_name}</p>
            )}
          </div>

          <div className={fieldClass('phone_number')}>
            <label htmlFor="phone_number">Phone Number <span className="required">*</span></label>
            <input
              id="phone_number"
              name="phone_number"
              inputMode="numeric"
              maxLength={10}
              value={form.phone_number}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              aria-invalid={Boolean(fieldErrors.phone_number)}
            />
            {fieldErrors.phone_number && (
              <p className="field-error">{fieldErrors.phone_number}</p>
            )}
          </div>

          <div className={fieldClass('extra_phone_number')}>
            <label htmlFor="extra_phone_number">Extra Phone</label>
            <input
              id="extra_phone_number"
              name="extra_phone_number"
              inputMode="numeric"
              maxLength={10}
              value={form.extra_phone_number}
              onChange={handleChange}
              placeholder="Optional 10-digit number"
              aria-invalid={Boolean(fieldErrors.extra_phone_number)}
            />
            {fieldErrors.extra_phone_number && (
              <p className="field-error">{fieldErrors.extra_phone_number}</p>
            )}
          </div>

          <div className={fieldClass('village_address')}>
            <label htmlFor="village_address">Village / Address <span className="required">*</span></label>
            <input
              id="village_address"
              name="village_address"
              value={form.village_address}
              onChange={handleChange}
              maxLength={FIELD_LIMITS.village_address}
              aria-invalid={Boolean(fieldErrors.village_address)}
            />
            {fieldErrors.village_address && (
              <p className="field-error">{fieldErrors.village_address}</p>
            )}
          </div>

          {/* Pickup Date & Time */}
          <div className={cn(fieldClass('pickup_date'), 'form-field')}>
            <label htmlFor="pickup_date">
              Pickup Date & Time <span className="required">*</span>
            </label>
            <DateTimeLocalInput
              id="pickup_date"
              name="pickup_date"
              value={form.pickup_date}
              min={pickupDateMin}
              max={datetimeMax}
              onChange={handleChange}
              dateInvalid={Boolean(fieldErrors.pickup_date)}
              timeInvalid={Boolean(fieldErrors.pickup_time)}
            />
            {(fieldErrors.pickup_date || fieldErrors.pickup_time) ? (
              <div className="mt-1 space-y-0.5">
                {fieldErrors.pickup_date && (
                  <p className="field-error text-[0.75rem]">{fieldErrors.pickup_date}</p>
                )}
                {fieldErrors.pickup_time && (
                  <p className="field-error text-[0.75rem]">{fieldErrors.pickup_time}</p>
                )}
              </div>
            ) : (
              <p className="mt-1 mb-0 text-[0.75rem] text-text-secondary">
                When customer picks up garments
              </p>
            )}
          </div>

          {/* Return Date & Time */}
          <div className={cn(fieldClass('return_date'), 'form-field')}>
            <label htmlFor="return_date">
              Return Date & Time <span className="required">*</span>
            </label>
            <DateTimeLocalInput
              id="return_date"
              name="return_date"
              value={form.return_date}
              min={returnDateMin}
              max={datetimeMax}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.return_date)}
            />
            {fieldErrors.return_date ? (
              <p className="field-error text-[0.75rem] mt-1">{fieldErrors.return_date}</p>
            ) : (
              <p className="mt-1 mb-0 text-[0.75rem] text-text-secondary">
                When customer returns garments
              </p>
            )}
          </div>

          {/* Billable Days */}
          <div className={cn(fieldClass('rental_days'), 'form-field')}>
            <label htmlFor="rental_days">
              Billable Days <span className="required">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <NumberInput
                id="rental_days"
                name="rental_days"
                integer
                min="1"
                maxLength={4}
                value={form.rental_days}
                onChange={handleChange}
                placeholder="Days"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.rental_days)}
                className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-[0.95rem] font-semibold"
              />
              {(() => {
                const activeMode =
                  form.rental_day_calculation_mode ||
                  settings?.rental_day_calculation_mode ||
                  'DIFF_2_DAYS'
                const calendarDays =
                  form.pickup_date && form.return_date
                    ? calcRentalDaysFromDates(form.pickup_date, form.return_date, activeMode)
                    : null
                const enteredDays = Math.trunc(Number(form.rental_days))
                const hasEnteredDays = Number.isInteger(enteredDays) && enteredDays >= 1
                const daysDiffer =
                  calendarDays != null && hasEnteredDays && enteredDays !== calendarDays

                return daysDiffer ? (
                  <p className="m-0 text-[0.75rem] text-text-secondary">
                    Shop policy counts {calendarDays} {calendarDays === 1 ? 'day' : 'days'}.{' '}
                    <button
                      type="button"
                      className="font-semibold text-amber-600 underline decoration-amber-500/60 dark:text-amber-400 cursor-pointer"
                      onClick={applyCalendarRentalDays}
                    >
                      Use calendar days
                    </button>
                  </p>
                ) : null
              })()}
            </div>
            {fieldErrors.rental_days && (
              <p className="field-error text-[0.75rem] mt-1">{fieldErrors.rental_days}</p>
            )}
          </div>

        </div>

        <div className={cn(fieldClass('selected_products'), 'form-field-full mt-2')}>
          <div className="flex flex-wrap items-baseline justify-between gap-1 pb-1 border-b border-border">
            <label className="text-[0.92rem] text-text font-bold">
              Bill Items <span className="required">*</span>
            </label>
            <span className="text-[0.75rem] text-text-secondary">
              Availability calculated from pickup & return dates
            </span>
          </div>

          {!hasRentalDates && (
            <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[0.82rem] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <i className="fa-solid fa-calendar-days text-[0.88rem]" />
              <span>Please select Pickup and Return dates & times above to check real-time stock and select products.</span>
            </div>
          )}

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_5.5rem_auto] items-end gap-2.5">
            <div className="form-field">
              <label htmlFor="add_product">Product</label>
              <ProductSearchSelect
                id="add_product"
                name="add_product"
                value={productId}
                onChange={handleProductChange}
                availabilityType="rent"
                useDate={hasRentalDates ? fromDatetimeLocalValue(form.pickup_date || form.use_date) : undefined}
                pickupDate={hasRentalDates ? fromDatetimeLocalValue(form.pickup_date || form.use_date) : undefined}
                returnDate={hasRentalDates ? fromDatetimeLocalValue(form.return_date) : undefined}
                excludeBookingId={isEdit ? id : undefined}
                disabled={!hasRentalDates}
                placeholder={
                  hasRentalDates
                    ? 'Search rental products…'
                    : 'Select pickup & return dates first'
                }
                emptyMessage="No rental products found"
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
                disabled={!hasRentalDates}
              />
            </div>
            <button
              type="button"
              className="h-[2.65rem] cursor-pointer rounded-[9px] border-0 bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_55%,#d97706_100%)] px-4 text-[0.9rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
              onClick={handleAddProduct}
              disabled={!hasRentalDates}
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
            <div className="mt-2.5 overflow-x-auto rounded-[10px] border border-border bg-white shadow-2xs">
              <table className="w-full min-w-[560px] border-collapse text-[0.88rem] [&_td]:border-b [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-middle [&_th]:border-b [&_th]:border-border [&_th]:bg-surface-muted [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:align-middle [&_th]:text-[0.72rem] [&_th]:font-bold [&_th]:tracking-[0.04em] [&_th]:text-text-secondary [&_th]:uppercase [&_tr:last-child_td]:border-b-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Daily Rent</th>
                    <th>Days</th>
                    <th>Amount</th>
                    <th aria-label="Actions" />
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
                              <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-medium" title="Available stock for selected dates (read-only)">
                                Avail: {item.max_quantity}
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
                            aria-label={`Quantity for ${item.product_name}`}
                            className="w-14 text-center rounded-lg border border-border px-1 py-1 font-semibold text-sm"
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
                          value={item.unit_price}
                          onChange={(e) => handleLineChange(item.key, 'unit_price', e.target.value)}
                          aria-label={`Daily rent for ${item.product_name}`}
                          className={cn(
                            'w-[6.5rem] rounded-lg border px-[0.55rem] py-[0.45rem] font-[inherit]',
                            (!item.unit_price || Number(item.unit_price) <= 0)
                              ? 'border-danger-text bg-danger-bg/20'
                              : 'border-border',
                          )}
                        />
                      </td>
                      <td className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
                        {normalizeRentalDays(form.rental_days)}
                      </td>
                      <td className="font-semibold whitespace-nowrap [font-variant-numeric:tabular-nums]">
                        {calcLineTotal(
                          item.quantity,
                          item.unit_price,
                          form.rental_days,
                        ).toLocaleString('en-IN', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className={cn(
                              'inline-flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[0.95rem] transition-colors',
                              itemHasAccessories(item)
                                ? 'text-accent hover:bg-accent-soft'
                                : 'text-text-secondary hover:bg-surface-muted hover:text-text',
                            )}
                            onClick={() => setAccessoriesItemKey(item.key)}
                            title="Add accessories"
                            aria-label={`Add accessories for ${item.product_name || 'item'}`}
                          >
                            <i className="fa-solid fa-shirt" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[1rem] text-danger-text transition-colors hover:bg-danger-bg hover:text-danger-text"
                            onClick={() => setRemovingItem(item)}
                            title="Remove item"
                            aria-label={`Remove ${item.product_name || 'item'}`}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </div>
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
            <p className="mt-2 mb-0 text-[0.85rem] text-text-secondary">
              No items added yet.
            </p>
          )}

          {fieldErrors.selected_products && (
            <p className="field-error">{fieldErrors.selected_products}</p>
          )}
        </div>

        {/* FINANCIAL SUMMARY & SETTLEMENT */}
        <div className="mt-6 flex flex-col gap-4">
          {/* Section 1: Rental Calculation Card */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs">
                  <i className="fa-solid fa-calculator" />
                </span>
                <h3 className="text-sm font-bold tracking-tight text-text m-0">Rental Calculation</h3>
              </div>
              <span className="text-xs text-text-muted">
                Items Subtotal + Accessories − Discount
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {/* Items Subtotal */}
              <div className="form-field m-0">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="subtotal" className="text-xs font-semibold text-text-secondary m-0">Items Subtotal (₹)</label>
                  <span className="text-[0.68rem] font-medium text-text-muted">Auto</span>
                </div>
                <NumberInput
                  id="subtotal"
                  name="subtotal"
                  value={form.subtotal}
                  readOnly
                  className="input-readonly font-semibold"
                  title="Sum of product rental prices for the selected billable days"
                />
              </div>

              {/* Accessories Price */}
              <div className="form-field m-0">
                <label htmlFor="accessories_price" className="text-xs font-semibold text-text-secondary mb-1">
                  Accessories Price (₹)
                </label>
                <NumberInput
                  id="accessories_price"
                  name="accessories_price"
                  min="0"
                  value={form.accessories_price}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              {/* Instant Discount */}
              <div className={cn(fieldClass('discount_amount'), 'm-0')}>
                <label htmlFor="discount_amount" className="text-xs font-semibold text-text-secondary mb-1">
                  Instant Discount (₹)
                </label>
                <NumberInput
                  id="discount_amount"
                  name="discount_amount"
                  min="0"
                  value={form.discount_amount}
                  onChange={handleChange}
                  placeholder="0"
                  aria-invalid={Boolean(fieldErrors.discount_amount)}
                />
                {fieldErrors.discount_amount && (
                  <p className="field-error">{fieldErrors.discount_amount}</p>
                )}
              </div>

              {/* Tax (if enabled) or Final Amount */}
              {Number(resolveTaxRate(form.tax_rate)) > 0 && (
                <div className="form-field m-0">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="tax_amount" className="text-xs font-semibold text-text-secondary m-0">
                      Tax ({resolveTaxRate(form.tax_rate)}%)
                    </label>
                    <span className="text-[0.68rem] font-medium text-text-muted">Auto</span>
                  </div>
                  <NumberInput
                    id="tax_amount"
                    name="tax_amount"
                    value={form.tax_amount}
                    readOnly
                    className="input-readonly"
                  />
                </div>
              )}

              {/* Final Rental Amount Banner / Field */}
              <div className={cn(fieldClass('rental_total'), 'm-0', Number(resolveTaxRate(form.tax_rate)) > 0 ? 'col-span-full' : 'sm:col-span-1')}>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="rental_total" className="text-xs font-bold text-accent uppercase tracking-wider m-0">
                    Final Rental Amount <span className="required">*</span>
                  </label>
                  <span className="text-[0.68rem] font-semibold text-accent">Payable Rent</span>
                </div>
                <NumberInput
                  id="rental_total"
                  name="rental_total"
                  min="0"
                  value={form.rental_total}
                  readOnly
                  className="input-readonly font-bold text-accent text-base bg-accent/5 border-accent/25"
                  aria-invalid={Boolean(fieldErrors.rental_total)}
                />
                {fieldErrors.rental_total && (
                  <p className="field-error">{fieldErrors.rental_total}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Rent Payment (Advance Jama & Remaining Baki) */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 text-xs">
                  <i className="fa-solid fa-hand-holding-dollar" />
                </span>
                <h3 className="text-sm font-bold tracking-tight text-text m-0">Rent Payment & Settlement</h3>
              </div>
              <span className="text-xs text-text-muted">
                Final Amount − Advance Paid
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={cn(fieldClass('paid_amount'), 'm-0')}>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="paid_amount" className="text-xs font-semibold text-text-secondary m-0">
                    Advance Rent Paid (Jama ₹) {!isEdit && <span className="required">*</span>}
                  </label>
                  <span className="text-[0.68rem] font-medium text-emerald-600">Collected Rent</span>
                </div>
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

              <div className="form-field m-0">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="due_amount" className="text-xs font-semibold text-text-secondary m-0">
                    Remaining Rent Due (Baki ₹)
                  </label>
                  <span className="text-[0.68rem] font-semibold text-amber-600">To Pay Later</span>
                </div>
                <NumberInput
                  id="due_amount"
                  name="due_amount"
                  value={form.due_amount}
                  readOnly
                  className="input-readonly font-bold text-amber-600 bg-amber-500/5 border-amber-500/25"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Refundable Security Deposit Card */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 text-xs">
                  <i className="fa-solid fa-shield-halved" />
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-text m-0">Refundable Security Deposit</h3>
                  <p className="text-[0.72rem] text-text-muted m-0">Held separately from rental charges and refunded upon item return</p>
                </div>
              </div>
              {Number(form.security_deposit) > 0 && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                  form.deposit_paid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                )}>
                  <i className={cn('fa-solid text-[0.7rem]', form.deposit_paid ? 'fa-circle-check' : 'fa-clock')} />
                  {form.deposit_paid ? 'Deposit Collected' : 'Deposit Pending at Pickup'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Deposit Amount Input */}
              <div className={cn(fieldClass('security_deposit'), 'm-0 lg:col-span-5')}>
                <label htmlFor="security_deposit" className="text-xs font-semibold text-text-secondary mb-1">
                  Deposit Amount (₹)
                </label>
                <NumberInput
                  id="security_deposit"
                  name="security_deposit"
                  min="0"
                  value={form.security_deposit}
                  onChange={handleChange}
                  placeholder="0"
                  aria-invalid={Boolean(fieldErrors.security_deposit)}
                />
                <p className="m-0 mt-1 text-[0.7rem] text-text-muted">
                  Can be adjusted anytime (e.g. ₹500 at booking, ₹300 at pickup)
                </p>
                {fieldErrors.security_deposit && (
                  <p className="field-error">{fieldErrors.security_deposit}</p>
                )}
              </div>

              {/* Segmented 2-Pill Switch for Deposit Status */}
              <div className="m-0 lg:col-span-7 flex flex-col justify-center">
                <label className="text-xs font-semibold text-text-secondary mb-1">
                  Deposit Collection Status
                </label>
                <div className="grid grid-cols-2 p-1 bg-surface-muted/60 border border-border rounded-lg gap-1.5 h-[2.75rem]">
                  <button
                    type="button"
                    onClick={() => {
                      if (Number(form.security_deposit) > 0) {
                        setForm((prev) => ({ ...prev, deposit_paid: false }))
                      }
                    }}
                    disabled={Number(form.security_deposit) <= 0}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer border',
                      !form.deposit_paid && Number(form.security_deposit) > 0
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-transparent border-transparent text-text-secondary hover:text-text disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    <i className="fa-solid fa-clock text-[0.75rem]" />
                    <span>Pending at Pickup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (Number(form.security_deposit) > 0) {
                        setForm((prev) => ({ ...prev, deposit_paid: true }))
                      }
                    }}
                    disabled={Number(form.security_deposit) <= 0}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer border',
                      form.deposit_paid && Number(form.security_deposit) > 0
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-transparent border-transparent text-text-secondary hover:text-text disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    <i className="fa-solid fa-circle-check text-[0.75rem]" />
                    <span>Paid / Received (Jama)</span>
                  </button>
                </div>
                <p className="m-0 mt-1 text-[0.7rem] text-text-muted">
                  {Number(form.security_deposit) <= 0
                    ? 'Enter an amount above to select deposit status.'
                    : form.deposit_paid
                      ? `₹${Number(form.security_deposit).toLocaleString('en-IN')} deposit received safely and held separately.`
                      : `₹${Number(form.security_deposit).toLocaleString('en-IN')} deposit will be collected together with due rent at pickup time.`}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Payment Method (When any money is paid or collected) */}
          {(Number(form.paid_amount) > 0 || (form.deposit_paid && Number(form.security_deposit) > 0)) && (
            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="form-field m-0">
                  <label htmlFor="payment_method" className="text-xs font-semibold text-text-secondary mb-1">
                    Payment Method
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={form.payment_method || 'CASH'}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Online</option>
                    <option value="CARD">Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                  </select>
                </div>
                <div className="text-xs text-text-muted">
                  Selected method applies to initial advance rent payment and/or security deposit receipt.
                </div>
              </div>
            </div>
          )}
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

        <div className="product-form-actions">
          <Link to={path("/booking")} className="product-form-cancel">
            Cancel
          </Link>
          <button
            type="button"
            className="product-form-print"
            onClick={handleBillAction}
            disabled={submitting}
          >
            <i className="fa-solid fa-print mr-1.5" />
            {isEdit ? 'Update & Print Bill' : 'Save & Print Bill'}
          </button>
          <button type="submit" className="product-form-submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Booking' : 'Create Booking'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(removingItem)}
        title="Remove Item"
        message={`Are you sure you want to remove ${removingItem?.product_name || 'this item'} from the list?`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (removingItem) {
            handleRemoveLine(removingItem.key)
            setRemovingItem(null)
          }
        }}
        onCancel={() => setRemovingItem(null)}
      />

      <BookingBillPrint billNo={billNo} form={printForm} settings={settings} />

      <ProductInfoDialog
        open={!!viewingProduct}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
      />

      <Dialog
        open={Boolean(accessoriesItem)}
        onClose={() => setAccessoriesItemKey(null)}
        titleId="booking-accessories-title"
        maxWidthClass="max-w-2xl"
        allowOverflow
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <i className="fa-solid fa-shirt text-sm" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3
                id="booking-accessories-title"
                className="m-0 font-display text-[1.12rem] font-semibold leading-snug tracking-[-0.02em] text-text sm:text-[1.18rem]"
              >
                Accessories & Items Included
              </h3>
              <p className="m-0 mt-0.5 text-xs leading-snug text-text-muted">
                {accessoriesItem?.product_name || 'This item'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAccessoriesItemKey(null)}
            aria-label="Close"
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-visible px-5 py-4">
          {accessoriesItem && (
            <AccessoriesFields
              form={accessoriesItem}
              onChange={handleAccessoryChange}
              showHeading={false}
            />
          )}
        </div>
        <div className="flex shrink-0 justify-end border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={() => setAccessoriesItemKey(null)}
            className="btn-primary text-[0.88rem]"
          >
            Done
          </button>
        </div>
      </Dialog>

      <UsageLimitModal
        open={Boolean(usageLimitData)}
        onClose={() => setUsageLimitData(null)}
        limitData={usageLimitData}
        tenantSlug={tenant?.slug}
      />
    </div>
  )
}

export default BookingFormPage

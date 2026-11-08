import { useId, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProductImageUrls, PRODUCT_PLACEHOLDER_IMAGE } from '@/config/api'
import {
  availabilityTypeLabel,
  resolveProductStatus,
  statusBadgeColorClasses,
} from '@/features/products/constants/products'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useTenant } from '@/shared/tenant/TenantContext'
import { displayValue, hasDisplayValue } from '@/shared/utils/displayValue'
import { buildProductWhatsAppMessage, openWhatsAppShare } from '@/shared/utils/whatsappShare'
import { cn } from '@/shared/utils/cn'
import { Dialog } from '@/shared/components/Dialog'
import CopyButton from '@/shared/components/CopyButton'

function formatCurrency(value) {
  if (!hasDisplayValue(value) && value !== 0 && value !== '0') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return displayValue(value)
  return `₹${amount.toLocaleString('en-IN')}`
}

const DETAIL_FIELDS = [
  { key: 'category', label: 'Category', required: true },
  { key: 'size', label: 'Size', required: true },
  { key: 'brand', label: 'Brand', required: false },
  { key: 'color', label: 'Color', required: false },
  { key: 'gender', label: 'Gender', required: false },
]

function ProductInfoGallery({ product }) {
  const images = getProductImageUrls(product)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState({})
  const [isPaused, setIsPaused] = useState(false)
  const safeIndex = images.length ? Math.min(index, images.length - 1) : 0
  const currentSrc = images[safeIndex] || ''
  const hasCarousel = images.length > 1
  const showFallback = !currentSrc || failed[safeIndex]

  useEffect(() => {
    setIndex(0)
    setFailed({})
    setIsPaused(false)
  }, [product?.id])

  useEffect(() => {
    if (!hasCarousel || isPaused) return undefined
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [hasCarousel, isPaused, images.length])

  const go = (delta) => {
    if (!images.length) return
    setIndex((current) => (current + delta + images.length) % images.length)
  }

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[linear-gradient(145deg,#f3f0ea,#ebe4d8)] sm:aspect-square group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {!showFallback ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={displayValue(product.product_name, 'Product')}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          onError={() => setFailed((prev) => ({ ...prev, [safeIndex]: true }))}
        />
      ) : (
        <img
          src={PRODUCT_PLACEHOLDER_IMAGE}
          alt={displayValue(product.product_name, 'Product')}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {hasCarousel && (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-2 z-[1] flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(17,17,17,0.55)] text-white transition-colors duration-160 hover:bg-[rgba(17,17,17,0.72)]"
            aria-label="Previous image"
            onClick={() => go(-1)}
          >
            <i className="fa-solid fa-chevron-left text-[0.7rem]" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-2 z-[1] flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(17,17,17,0.55)] text-white transition-colors duration-160 hover:bg-[rgba(17,17,17,0.72)]"
            aria-label="Next image"
            onClick={() => go(1)}
          >
            <i className="fa-solid fa-chevron-right text-[0.7rem]" aria-hidden="true" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 z-[1] flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={cn(
                  'size-1.5 cursor-pointer rounded-full border-0 p-0 transition-[background-color,transform] duration-160',
                  i === safeIndex ? 'scale-110 bg-white' : 'bg-white/55 hover:bg-white/80',
                )}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === safeIndex}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProductInfoDialog({ product, open, onClose, onAddStock, onViewLogs }) {
  const {
    companyName,
    path,
    branding,
    businessType: contextBusinessType,
    isRentalAllowed: contextRentalAllowed,
    isSalesAllowed: contextSalesAllowed,
  } = useTenant()
  const { user } = useAuth()
  const titleId = useId()
  const closeRef = useRef(null)
  const descRef = useRef(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [hasDescriptionOverflow, setHasDescriptionOverflow] = useState(false)

  useEffect(() => {
    setIsDescriptionExpanded(false)
    setHasDescriptionOverflow(false)
  }, [product?.id, product?.description])

  useLayoutEffect(() => {
    const el = descRef.current
    if (!el || !open) return

    const checkOverflow = () => {
      if (!isDescriptionExpanded) {
        const isOverflowing = el.scrollHeight > el.clientHeight + 1
        setHasDescriptionOverflow(isOverflowing)
      }
    }

    checkOverflow()

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)
    return () => observer.disconnect()
  }, [product?.id, product?.description, open, isDescriptionExpanded])

  if (!open || !product) return null

  const tenantBusinessType = String(
    contextBusinessType ||
      branding?.businessType ||
      branding?.business_type ||
      user?.tenant?.businessType ||
      user?.tenant?.business_type ||
      'SALES_AND_RENTAL',
  ).toUpperCase()

  const availabilityType = String(
    product.availability_type || product.availabilityType || 'rent',
  ).toLowerCase()

  const isRentalAllowed = contextRentalAllowed ?? (tenantBusinessType !== 'SALES')
  const isSalesAllowed = contextSalesAllowed ?? (tenantBusinessType !== 'RENTAL')

  const isRentalActive = isRentalAllowed && availabilityType !== 'sell'
  const isSalesActive = isSalesAllowed && availabilityType !== 'rent'
  const isHybridActive = isRentalActive && isSalesActive

  const dailyRentValue = Number(product.daily_rent ?? product.dailyRent ?? 0)
  const salePriceValue = Number(product.sale_price ?? product.salePrice ?? 0)

  const showDailyRent = isRentalActive && dailyRentValue > 0
  const showSalePrice = isSalesActive && salePriceValue > 0
  const hasAnyPrice = showDailyRent || showSalePrice

  const visibleDetailFields = DETAIL_FIELDS.filter(
    ({ key, required }) => required || hasDisplayValue(product[key]),
  )

  const status = resolveProductStatus(product)
  const totalQty = Number(product.total_quantity ?? product.quantity ?? 0)
  const soldQty = Number(product.sold_quantity ?? product.sold_count ?? 0)
  const totalPurchased = Number(product.total_purchased_quantity ?? (totalQty + soldQty))
  const damagedQty = Number(product.damaged_quantity || 0)
  const inStockQty = Math.max(0, totalQty - damagedQty)
  const rentedQty = Number(
    product.rented_today ??
      product.rented_quantity ??
      Math.max(0, inStockQty - Number(product.available_quantity ?? inStockQty)),
  )
  const availableQty =
    product.available_quantity != null
      ? Math.max(0, Number(product.available_quantity))
      : Math.max(0, inStockQty - rentedQty)
  const peakReserved = Number(product.peak_reserved ?? product.peak_rentals ?? rentedQty)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-[52rem]"
      className="max-h-[min(92vh,52rem)]"
    >
        <div className="flex items-start justify-between gap-3 border-b border-border px-[1.25rem] py-[1rem]">
          <div className="min-w-0">
            <p className="m-0 text-[0.72rem] font-bold tracking-[0.06em] text-text-muted uppercase">
              Product details
            </p>
            <h2
              id={titleId}
              className="m-0 mt-[0.2rem] truncate font-display text-[1.25rem] font-semibold tracking-[-0.02em] text-text"
            >
              {displayValue(product.product_name)}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-text transition-[background-color,border-color] duration-160 hover:bg-surface-muted"
            aria-label="Close"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-[1.25rem]">
          <div className="grid gap-[1.25rem] md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <ProductInfoGallery product={product} />
              {hasAnyPrice && (
                <div className="grid gap-2">
                  {showDailyRent && (
                    <div className="flex flex-col gap-[0.12rem] rounded-[10px] border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] p-[0.65rem]">
                      <span className="text-[0.66rem] font-bold tracking-[0.04em] text-text-muted uppercase">
                        Daily Rent
                      </span>
                      <span className="text-[0.95rem] font-bold text-text">
                        {formatCurrency(dailyRentValue)}
                      </span>
                    </div>
                  )}
                  {showSalePrice && (
                    <div className="flex flex-col gap-[0.12rem] rounded-[10px] border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] p-[0.65rem]">
                      <span className="text-[0.66rem] font-bold tracking-[0.04em] text-text-muted uppercase">
                        Sale Price
                      </span>
                      <span className="text-[0.95rem] font-bold text-text">
                        {formatCurrency(salePriceValue)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-[1.1rem]">
              <div className="flex flex-wrap items-center gap-[0.55rem]">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[0.9rem] font-semibold text-accent">
                    {displayValue(product.product_code)}
                  </span>
                  {hasDisplayValue(product.product_code) && (
                    <CopyButton text={product.product_code} />
                  )}
                </div>
                <span
                  className={cn(
                    'inline-block rounded-lg px-[0.65rem] py-[0.3rem] text-[0.75rem] font-bold',
                    statusBadgeColorClasses(status),
                  )}
                >
                  {status}
                </span>
                {isRentalAllowed && isSalesAllowed && (
                  <span className="inline-block rounded-lg px-[0.6rem] py-[0.28rem] text-[0.72rem] font-semibold bg-surface-muted text-text-secondary border border-border">
                    {availabilityTypeLabel(product.availability_type || product.availabilityType)}
                  </span>
                )}
              </div>

              {visibleDetailFields.length > 0 && (
                <div className="grid grid-cols-2 gap-x-[1rem] gap-y-[0.75rem] sm:grid-cols-3">
                  {visibleDetailFields.map(({ key, label }) => (
                    <div key={key} className="flex min-w-0 flex-col gap-[0.15rem]">
                      <span className="text-[0.66rem] font-bold tracking-[0.04em] text-text-muted uppercase">
                        {label}
                      </span>
                      <span className="truncate text-[0.92rem] font-semibold text-text">
                        {displayValue(product[key])}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock Health */}
              <div className="rounded-xl border border-border bg-surface-muted/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.66rem] font-bold tracking-[0.04em] text-text-muted uppercase">
                    Inventory Stock Health (Today)
                  </span>
                  <span className="text-[0.68rem] font-semibold text-text-secondary">
                    {[
                      isSalesActive && soldQty > 0 ? `${soldQty} sold` : null,
                      isRentalActive && rentedQty > 0 ? `${rentedQty} in rental` : null,
                      `${totalPurchased} total acquired`,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
                <div
                  className={cn(
                    'mt-2 grid grid-cols-2 gap-2 text-center',
                    isHybridActive ? 'sm:grid-cols-5' : 'sm:grid-cols-4',
                  )}
                >
                  <div className="rounded-lg border border-border bg-surface p-2 shadow-xs flex flex-col justify-between">
                    <span className="block text-[0.65rem] font-bold uppercase text-text-muted">Total Stock</span>
                    <span className="text-base font-bold text-text">{totalPurchased}</span>
                    <span className="text-[0.62rem] text-text-muted font-medium">Total acquired</span>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-2 shadow-xs flex flex-col justify-between">
                    <span className="block text-[0.65rem] font-bold uppercase text-emerald-600">Available</span>
                    <span
                      className={cn(
                        'text-base font-bold',
                        availableQty > 0 ? 'text-emerald-600' : 'text-danger-text',
                      )}
                    >
                      {availableQty}
                    </span>
                    <span className="text-[0.62rem] text-emerald-600/80 font-medium">
                      {isSalesActive && !isRentalActive ? 'Ready for sale' : 'Ready in shop'}
                    </span>
                  </div>

                  {isRentalActive && (
                    <div className="rounded-lg border border-border bg-surface p-2 shadow-xs flex flex-col justify-between">
                      <span className="block text-[0.65rem] font-bold uppercase text-amber-600 dark:text-amber-400">
                        In Rental
                      </span>
                      <span
                        className={cn(
                          'text-base font-bold',
                          rentedQty > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted',
                        )}
                      >
                        {rentedQty}
                      </span>
                      <span className="text-[0.62rem] text-amber-600/80 dark:text-amber-400/80 font-medium">
                        {peakReserved > rentedQty ? `${peakReserved} reserved peak` : 'Active today'}
                      </span>
                    </div>
                  )}

                  {isSalesActive && (
                    <div className="rounded-lg border border-border bg-surface p-2 shadow-xs flex flex-col justify-between">
                      <span className="block text-[0.65rem] font-bold uppercase text-blue-600 dark:text-blue-400">
                        Total Sold
                      </span>
                      <span
                        className={cn(
                          'text-base font-bold',
                          soldQty > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-text-muted',
                        )}
                      >
                        {soldQty}
                      </span>
                      <span className="text-[0.62rem] text-blue-600/80 dark:text-blue-400/80 font-medium">
                        Direct sales
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      'rounded-lg border border-border bg-surface p-2 shadow-xs flex flex-col justify-between',
                      isHybridActive ? 'col-span-2 sm:col-span-1' : '',
                    )}
                  >
                    <span className="block text-[0.65rem] font-bold uppercase text-danger-text">Damaged</span>
                    <span
                      className={cn(
                        'text-base font-bold',
                        damagedQty > 0 ? 'text-danger-text' : 'text-text-muted',
                      )}
                    >
                      {damagedQty}
                    </span>
                    <span className="text-[0.62rem] text-danger-text/80 font-medium">
                      {damagedQty > 0 ? 'Needs repair' : 'Zero damage'}
                    </span>
                  </div>
                </div>
              </div>

              {hasDisplayValue(product.description) && (
                <div className="flex flex-col gap-[0.3rem]">
                  <span className="text-[0.66rem] font-bold tracking-[0.04em] text-text-muted uppercase">
                    Description
                  </span>
                  <p
                    ref={descRef}
                    className={cn(
                      'm-0 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-text-secondary transition-all duration-200',
                      !isDescriptionExpanded && 'line-clamp-2',
                    )}
                  >
                    {displayValue(product.description)}
                  </p>
                  {(hasDescriptionOverflow || isDescriptionExpanded) && (
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                      className="self-start inline-flex items-center gap-1 text-[0.78rem] font-bold text-accent transition-colors hover:text-accent/80 hover:underline cursor-pointer focus:outline-none"
                    >
                      {isDescriptionExpanded ? (
                        <>
                          <span>See less</span>
                          <i className="fa-solid fa-chevron-up text-[0.65rem]" aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          <span>See more</span>
                          <i className="fa-solid fa-chevron-down text-[0.65rem]" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2.5 sm:justify-end sm:gap-[0.55rem] sm:px-[1.25rem] sm:py-[0.95rem]">
          <button
            type="button"
            className="cursor-pointer rounded-[9px] border border-border bg-white px-3 py-1.5 sm:px-[0.95rem] sm:py-[0.55rem] text-[0.85rem] sm:text-[0.88rem] font-semibold text-text transition-[background-color,border-color] duration-160 hover:bg-surface-muted"
            onClick={onClose}
          >
            Close
          </button>

          <div className="flex items-center gap-1.5 sm:gap-[0.55rem]">
            {onViewLogs && (
              <button
                type="button"
                className="inline-flex size-9 sm:size-auto cursor-pointer items-center justify-center gap-[0.4rem] rounded-[9px] border border-border bg-white p-0 sm:px-[0.95rem] sm:py-[0.55rem] text-[0.88rem] font-semibold text-text-secondary transition-[background-color,border-color] duration-160 hover:bg-surface-muted"
                onClick={() => {
                  onClose?.()
                  onViewLogs(product)
                }}
                title="Stock Movement History"
                aria-label="Stock Movement History"
              >
                <i className="fa-solid fa-clock-rotate-left text-[0.9rem]" aria-hidden="true" />
                <span className="hidden sm:inline">Stock History</span>
              </button>
            )}
{/* 
            {onAddStock && (
              <button
                type="button"
                className="inline-flex size-9 sm:size-auto cursor-pointer items-center justify-center gap-[0.4rem] rounded-[9px] border border-emerald-600/30 bg-emerald-50 p-0 sm:px-[0.95rem] sm:py-[0.55rem] text-[0.88rem] font-semibold text-emerald-700 transition-[background-color,border-color] duration-160 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                onClick={() => {
                  onClose?.()
                  onAddStock(product)
                }}
                title="Add Stock"
                aria-label="Add Stock"
              >
                <i className="fa-solid fa-plus text-[0.85rem]" aria-hidden="true" />
                <span className="hidden sm:inline">Add Stock</span>
              </button>
            )} */}

            <button
              type="button"
              className="inline-flex size-9 sm:size-auto cursor-pointer items-center justify-center gap-[0.4rem] rounded-[9px] border border-border bg-white p-0 sm:px-[0.95rem] sm:py-[0.55rem] text-[0.88rem] font-semibold text-[#128c7e] transition-[background-color,border-color] duration-160 hover:border-[#128c7e]/40 hover:bg-[#128c7e]/5"
              onClick={() => {
                openWhatsAppShare({
                  message: buildProductWhatsAppMessage(product, companyName),
                })
              }}
              title="Share on WhatsApp"
              aria-label="Share on WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-[1rem]" aria-hidden="true" />
              <span className="hidden sm:inline">Share</span>
            </button>
{/* 
            <Link
              to={path(`/products/${product.id}/edit`)}
              state={{ product }}
              className="inline-flex size-9 sm:size-auto cursor-pointer items-center justify-center gap-[0.4rem] rounded-[9px] border-0 bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_55%,#d97706_100%)] p-0 sm:px-[0.95rem] sm:py-[0.55rem] text-[0.85rem] sm:text-[0.88rem] font-semibold text-white no-underline shadow-[0_6px_14px_rgba(217,119,6,0.28)] transition-[filter] duration-160 hover:brightness-[1.03]"
              onClick={onClose}
              title="Edit Product"
              aria-label="Edit Product"
            >
              <i className="fa-solid fa-pen-to-square text-[0.88rem]" aria-hidden="true" />
              <span className="hidden sm:inline">Edit</span>
            </Link> */}
          </div>
        </div>
    </Dialog>
  )
}

export default ProductInfoDialog

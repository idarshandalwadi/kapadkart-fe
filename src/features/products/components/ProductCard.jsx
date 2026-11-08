import { useState } from 'react'
import ProductActions from './ProductActions'
import { getProductImageUrls, PRODUCT_PLACEHOLDER_IMAGE } from '@/config/api'
import {
  getStockLevel,
  isOutOfStock,
  resolveProductStatus,
  statusBadgeColorClasses,
} from '@/features/products/constants/products'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useTenant } from '@/shared/tenant/TenantContext'
import { displayValue, hasDisplayValue } from '@/shared/utils/displayValue'
import CopyButton from '@/shared/components/CopyButton'
import Skeleton from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

function ProductCardImage({ product }) {
  const images = getProductImageUrls(product)
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [failed, setFailed] = useState({})
  const [loaded, setLoaded] = useState({})

  const displayIndex = hovered && index === 0 && images.length > 1 ? 1 : index
  const safeIndex = images.length ? Math.min(displayIndex, images.length - 1) : 0
  const currentSrc = images[safeIndex] || ''
  const hasCarousel = images.length > 1
  const showFallback = !currentSrc || failed[safeIndex]
  const isImageLoaded = loaded[safeIndex]

  const go = (delta) => {
    if (!images.length) return
    setIndex((current) => (current + delta + images.length) % images.length)
  }

  return (
    <div
      className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-slate-100 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!showFallback ? (
        <>
          {!isImageLoaded && (
            <Skeleton
              variant="image"
              className="absolute inset-0 h-full w-full rounded-none"
            />
          )}
          <img
            key={currentSrc}
            src={currentSrc}
            alt={displayValue(product.product_name, 'Product')}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-105',
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
            onLoad={() => setLoaded((prev) => ({ ...prev, [safeIndex]: true }))}
            onError={() => setFailed((prev) => ({ ...prev, [safeIndex]: true }))}
          />
        </>
      ) : (
        <img
          src={PRODUCT_PLACEHOLDER_IMAGE}
          alt={displayValue(product.product_name, 'Product')}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* Top Header Overlay: Category & Status */}
      <div className="absolute top-2 inset-x-2 z-[2] flex items-center justify-between gap-1">
        {hasDisplayValue(product.category) ? (
          <span className="truncate max-w-[55%] rounded-md bg-black/65 px-1.5 py-0.5 text-[0.62rem] sm:text-[0.68rem] font-medium text-white/95 backdrop-blur-xs shadow-xs">
            {displayValue(product.category)}
          </span>
        ) : <span />}
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[0.62rem] sm:text-[0.68rem] font-bold tracking-[0.02em] shadow-xs',
            statusBadgeColorClasses(resolveProductStatus(product)),
          )}
        >
          {resolveProductStatus(product)}
        </span>
      </div>

      {/* Bottom overlay for Size & Available stock */}
      <div className="absolute bottom-2 inset-x-2 z-[2] flex items-center justify-between text-[0.65rem] sm:text-[0.7rem] font-bold">
        {hasDisplayValue(product.size) && (
          <span className="rounded bg-black/70 px-1.5 py-0.5 text-white backdrop-blur-xs">
            {displayValue(product.size)}
          </span>
        )}
        <span
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 backdrop-blur-xs shadow-xs',
            (product.total_quantity ?? 0) <= 0
              ? 'bg-rose-950/80 text-rose-200'
              : 'bg-emerald-950/80 text-emerald-200',
          )}
        >
          {(product.total_quantity ?? 0) <= 0 ? 'Out of stock' : `Stock: ${product.total_quantity ?? 0}`}
        </span>
      </div>

      {hasCarousel && (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-1.5 z-[2] flex size-6 sm:size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(17,17,17,0.55)] text-white transition-colors duration-160 hover:bg-[rgba(17,17,17,0.8)]"
            aria-label="Previous image"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(-1)
            }}
          >
            <i className="fa-solid fa-chevron-left text-[0.6rem]" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-1.5 z-[2] flex size-6 sm:size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(17,17,17,0.55)] text-white transition-colors duration-160 hover:bg-[rgba(17,17,17,0.8)]"
            aria-label="Next image"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(1)
            }}
          >
            <i className="fa-solid fa-chevron-right text-[0.6rem]" aria-hidden="true" />
          </button>
          <div className="absolute bottom-1 left-1/2 z-[2] flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={cn(
                  'size-1 cursor-pointer rounded-full border-0 p-0 transition-transform duration-160',
                  i === safeIndex ? 'scale-125 bg-white' : 'bg-white/50',
                )}
                aria-label={`Show image ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIndex(i)
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProductCard({
  product,
  onDelete,
  onView,
  deleting,
  lowStockThreshold,
  onAddStock,
  onRestoreDamaged,
  onViewLogs,
}) {
  const { branding } = useTenant()
  const { user } = useAuth()
  const tenantBusinessType = String(
    branding?.businessType ||
      branding?.business_type ||
      user?.tenant?.businessType ||
      user?.tenant?.business_type ||
      'SALES_AND_RENTAL',
  ).toUpperCase()

  const isRentalAllowed = tenantBusinessType !== 'SALES'
  const isSalesAllowed = tenantBusinessType !== 'RENTAL'

  const availabilityType = String(
    product.availability_type || product.availabilityType || 'rent',
  ).toLowerCase()

  const status = resolveProductStatus(product)
  const stockLevel = getStockLevel(product.total_quantity ?? product.quantity, lowStockThreshold)
  const outOfStock = stockLevel === 'out_of_stock' || isOutOfStock(status)
  const lowStock = stockLevel === 'low_stock'

  const dailyRent = Number(product.daily_rent) || 0
  const salePrice = Number(product.sale_price) || 0
  const damagedQty = Number(product.damaged_quantity) || 0

  const showRent = isRentalAllowed && availabilityType !== 'sell' && dailyRent > 0
  const showSale = isSalesAllowed && availabilityType !== 'rent' && salePrice > 0

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onView?.(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView?.(product)
        }
      }}
      className={cn(
        'group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-xs transition-[transform,box-shadow,border-color,background-color] duration-160 hover:-translate-y-[2px] hover:shadow-md',
        outOfStock
          ? 'border-[#c5ced8] bg-info-bg/40 hover:border-[#a8b4c0]'
          : lowStock
            ? 'border-[#f0d19a] bg-warning-bg/25 hover:border-[#e8b86a]'
            : 'border-border bg-surface hover:border-[#f0d19a]',
      )}
    >
      <ProductCardImage product={product} />

      <div className="flex min-h-0 flex-1 flex-col justify-between p-2.5 sm:p-3.5 gap-2">
        <div className="flex flex-col gap-1">
          {/* Brand and Product Code */}
          <div className="flex items-center justify-between gap-1 text-[0.68rem] sm:text-[0.74rem]">
            <span className="font-semibold text-accent truncate">
              {displayValue(product.brand || product.product_code)}
            </span>
            {hasDisplayValue(product.product_code) && (
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="font-mono text-text-muted text-[0.65rem]">
                  {product.product_code}
                </span>
                <CopyButton
                  text={product.product_code}
                  className="p-0.5 text-text-muted hover:text-accent-text"
                  iconClassName="text-[0.68rem]"
                  title="Copy Product Code"
                />
              </div>
            )}
          </div>

          {/* Product Name */}
          <h2 className="m-0 line-clamp-2 font-display text-[0.82rem] sm:text-[0.95rem] leading-[1.25] font-semibold tracking-[-0.02em] text-text group-hover:text-accent-text transition-colors">
            {displayValue(product.product_name)}
          </h2>
        </div>

        {/* Pricing & Stock section */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          {(showRent || showSale) && (
            <div className="flex flex-wrap items-baseline justify-between gap-1 rounded-lg border border-[rgba(245,158,11,0.15)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2 py-1.5">
              {showRent && (
                <div className="flex flex-col">
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider text-text-muted">
                    Rent
                  </span>
                  <span className="font-bold text-[0.85rem] sm:text-[0.92rem] text-text">
                    ₹{dailyRent.toLocaleString('en-IN')}
                    <span className="text-[0.62rem] font-normal text-text-muted ml-0.5">/day</span>
                  </span>
                </div>
              )}
              {showSale && (
                <div className={cn('flex flex-col', showRent ? 'items-end' : 'items-start')}>
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider text-text-muted">
                    Sale
                  </span>
                  <span
                    className={cn(
                      'font-semibold text-text',
                      showRent
                        ? 'text-[0.75rem] sm:text-[0.82rem] text-text-secondary'
                        : 'text-[0.85rem] sm:text-[0.92rem]',
                    )}
                  >
                    ₹{salePrice.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Damaged Alert if any */}
          {damagedQty > 0 && (
            <div className="flex items-center gap-1 text-[0.68rem] font-bold text-danger-text">
              <i className="fa-solid fa-triangle-exclamation text-[0.65rem]" />
              <span>{damagedQty} unit{damagedQty > 1 ? 's' : ''} damaged</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          className="pt-1 border-t border-border/60"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ProductActions
            product={product}
            onDelete={onDelete}
            deleting={deleting}
            onAddStock={onAddStock}
            onRestoreDamaged={onRestoreDamaged}
            onViewLogs={onViewLogs}
          />
        </div>
      </div>
    </article>
  )
}

export default ProductCard


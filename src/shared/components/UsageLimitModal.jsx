import { useId } from 'react'
import { Dialog } from './Dialog'
import { buildUsageLimitWhatsAppUrl, SUPPORT_CONFIG } from '@/config/support'
import { cn } from '@/shared/utils/cn'

export function UsageLimitModal({
  open,
  onClose,
  limitData = {},
  tenantSlug,
}) {
  const titleId = useId()
  const descId = useId()

  const {
    resource = 'products',
    limit,
    current,
    code,
    message,
  } = limitData || {}

  const isProduct = resource === 'products' || code === 'PRODUCT_LIMIT_REACHED'
  const isBooking = resource === 'bookings' || code === 'BOOKING_LIMIT_REACHED'
  const isSale = resource === 'sales' || code === 'SALES_LIMIT_REACHED'

  const resourceTitle = isProduct
    ? 'Product Limit Reached'
    : isBooking
      ? 'Booking Limit Reached'
      : isSale
        ? 'Sales Limit Reached'
        : 'Usage Limit Reached'

  const resourceNoun = isProduct
    ? 'products'
    : isBooking
      ? 'bookings'
      : isSale
        ? 'sales'
        : 'items'

  const defaultExplanation = isProduct
    ? 'Your shop has reached its product creation limit. Contact your administrator or support to upgrade your plan.'
    : isBooking
      ? 'Your shop has reached its rental booking capacity. Contact your administrator or support to increase your quota.'
      : isSale
        ? 'Your shop has reached its sales transaction limit. Contact your administrator or support to increase your quota.'
        : 'Your shop has reached the allowed limit for this operation.'

  const explanation = message || defaultExplanation

  const whatsappUrl = buildUsageLimitWhatsAppUrl({
    resource: resourceNoun,
    limit,
    current,
    tenantSlug,
  })

  const hasUsageMetrics = Number.isFinite(limit) && limit > 0
  const percentage = hasUsageMetrics
    ? Math.min(100, Math.round(((Number(current) || limit) / limit) * 100))
    : 100

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-[30rem]"
      className="p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4">
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <i className="fa-solid fa-gauge-high text-xl" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="m-0 font-display text-[1.18rem] font-bold tracking-tight text-text"
            >
              {resourceTitle}
            </h2>
            <p
              id={descId}
              className="mt-1.5 mb-0 text-[0.9rem] leading-relaxed text-text-secondary"
            >
              {explanation}
            </p>
          </div>
        </div>

        {/* Usage Progress Card (when reliable limits exist) */}
        {hasUsageMetrics && (
          <div className="rounded-xl border border-border/80 bg-surface-raised p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span>Current Usage</span>
              <span className="font-mono text-text">
                {current !== undefined ? current : limit} / {limit}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  percentage >= 100 ? 'bg-amber-500' : 'bg-accent'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-2 mb-0 text-[0.8rem] text-text-muted">
              100% of your configured {resourceNoun} capacity has been utilized.
            </p>
          </div>
        )}

        {/* Support Note */}
        <div className="rounded-xl border border-border/60 bg-light/50 px-3.5 py-2.5 text-xs text-text-muted flex items-center gap-2">
          <i className="fa-solid fa-headset text-text-muted shrink-0" aria-hidden="true" />
          <span>Support team is available for instant quota upgrades.</span>
        </div>

        {/* Actions */}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2.5 max-[480px]:flex-col max-[480px]:*:w-full">
          <button
            type="button"
            className="btn-secondary text-[0.88rem] max-[480px]:order-2"
            onClick={onClose}
          >
            Close
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2 text-[0.88rem] max-[480px]:order-1"
          >
            <i className="fa-brands fa-whatsapp text-base" aria-hidden="true" />
            <span>Contact Support ({SUPPORT_CONFIG.phoneDisplay})</span>
          </a>
        </div>
      </div>
    </Dialog>
  )
}

export default UsageLimitModal

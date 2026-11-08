import BrandLogo from '@/shared/components/BrandLogo'
import { resolveBrandAssetUrl } from '@/shared/tenant/tenant'
import { cn } from '@/shared/utils/cn'

/**
 * Live bill header preview card.
 * Gives instant visual feedback to shop owners on how their branding,
 * contact details, and GST appear on customer bills.
 */
function LiveBillHeaderPreview({ form, className = '' }) {
  const logoSrc = resolveBrandAssetUrl(form.logo_url) || form.logo_url
  const companyName = form.company_name?.trim() || 'Your Company Name'
  const phone = form.phone_number?.trim() || '09106586234'
  const address = form.address?.trim() || 'Shop Address, City, State - PIN'
  const gst = form.gst_number?.trim()
  const upiId = form.upi_id?.trim()

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-accent text-xs">
            <i className="fa-solid fa-receipt" aria-hidden="true" />
          </span>
          <h3 className="m-0 text-xs sm:text-sm font-bold uppercase tracking-[0.05em] text-text-secondary">
            Live Bill Header Preview
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700">
          Real-time
        </span>
      </div>

      {/* Bill preview simulation box */}
      <div className="rounded-xl border border-border/80 bg-white p-4 text-xs text-text shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="m-0 font-display text-base font-bold text-text truncate">
              {companyName}
            </h4>
            <p className="m-0 mt-1 text-[0.75rem] text-text-secondary leading-snug line-clamp-2">
              {address}
            </p>
            <p className="m-0 mt-0.5 text-[0.72rem] font-medium text-text-muted">
              Phone: +91 {phone}
            </p>
            {gst && (
              <p className="m-0 mt-0.5 text-[0.72rem] font-mono font-semibold text-amber-800">
                GSTIN: {gst}
              </p>
            )}
          </div>

          {logoSrc ? (
            <div className="shrink-0 size-16 rounded-lg border border-border/60 bg-surface-muted/40 p-1 flex items-center justify-center overflow-hidden">
              <BrandLogo
                src={logoSrc}
                alt="Logo preview"
                surface="light"
                imgClassName="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="shrink-0 size-16 rounded-lg border border-dashed border-border bg-surface-muted flex flex-col items-center justify-center text-text-muted text-[0.65rem] text-center p-1">
              <i className="fa-regular fa-image text-sm mb-0.5" aria-hidden="true" />
              <span>No Logo</span>
            </div>
          )}
        </div>

        {upiId && (
          <div className="mt-3 pt-2 border-t border-dashed border-border flex items-center justify-between text-[0.7rem] text-text-muted">
            <span>UPI: <strong className="font-mono text-text">{upiId}</strong></span>
            <span className="text-[0.65rem] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              QR Enabled
            </span>
          </div>
        )}
      </div>

      <p className="m-0 text-[0.72rem] text-text-muted text-center">
        This is a live mockup of how your business details render at the top of printed and shared customer invoices.
      </p>
    </div>
  )
}

export default LiveBillHeaderPreview


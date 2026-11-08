function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBusinessType(type) {
  if (type === 'RENTAL') return 'Rental Only'
  if (type === 'SALES') return 'Direct Sales Only'
  return 'Rental & Sales (Dual)'
}

export default function OverviewTab({ shop, onNavigateTab }) {
  const settings = shop.settings || {}
  const owner = shop.owner || {}

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Store & Identity */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
          <h4 className="m-0 inline-flex items-center gap-2 font-display text-base font-semibold text-ink">
            <i className="fa-solid fa-globe text-accent" />
            Store & Identity
          </h4>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Display Name</span>
            <span className="font-medium text-ink">{shop.name || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Company Name</span>
            <span className="font-medium text-ink">{settings.company_name || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Page Title</span>
            <span className="font-medium text-ink">{settings.page_title || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Business Model</span>
            <span className="font-medium text-ink">
              {formatBusinessType(shop.business_type || shop.businessType)}
            </span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Catalog Quota</span>
            <span className="font-medium text-ink-soft">
              {shop.max_products != null ? `${shop.max_products} products max` : 'Unlimited'}
            </span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Rental Quota</span>
            <span className="font-medium text-ink-soft">
              {shop.max_bookings != null ? `${shop.max_bookings} bookings max` : 'Unlimited'}
            </span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Sales Quota</span>
            <span className="font-medium text-ink-soft">
              {shop.max_sales != null ? `${shop.max_sales} sales max` : 'Unlimited'}
            </span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Store Currency</span>
            <span className="font-semibold text-accent">{settings.currency || 'INR'}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">GST Number</span>
            <span className="font-mono text-ink-soft">{settings.gst_number || 'Not configured'}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2.5">
            <span className="text-muted">Tax Rate</span>
            <span className="font-medium text-ink">
              {settings.tax_rate !== undefined && settings.tax_rate !== null ? `${settings.tax_rate}%` : '0%'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Store Logo</span>
            <span className="font-medium text-ink-soft">
              {settings.logo_url ? 'Configured' : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Owner Account & Contact */}
      <div className="flex flex-col gap-6">
        {/* Primary Owner Account Card */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
            <h4 className="m-0 inline-flex items-center gap-2 font-display text-base font-semibold text-ink">
              <i className="fa-solid fa-user-shield text-accent" />
              Primary Owner Account
            </h4>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('users')}
                className="cursor-pointer text-xs font-semibold text-accent hover:underline"
              >
                View all users →
              </button>
            )}
          </div>

          {owner.id || owner.email ? (
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold">
                  {owner.full_name ? owner.full_name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div>
                  <div className="font-semibold text-ink">{owner.full_name || 'Owner'}</div>
                  <div className="text-xs text-muted font-mono">{owner.email}</div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 flex justify-between text-xs">
                <span className="text-muted">Account Registered</span>
                <span className="font-medium text-ink-soft">{formatDate(owner.created_at)}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted">Last Login</span>
                <span className="font-medium text-ink-soft">
                  {shop.last_login?.created_at ? formatDate(shop.last_login.created_at) : 'Never'}
                </span>
              </div>
            </div>
          ) : (
            <p className="m-0 text-xs text-muted">No owner account linked.</p>
          )}
        </div>

        {/* Contact & Location */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
            <h4 className="m-0 inline-flex items-center gap-2 font-display text-base font-semibold text-ink">
              <i className="fa-solid fa-address-book text-accent" />
              Contact & Address
            </h4>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-border/40 pb-2.5">
              <span className="text-muted">Phone Number</span>
              {settings.phone_number ? (
                <a
                  href={`tel:${settings.phone_number}`}
                  className="font-medium text-accent hover:underline no-underline inline-flex items-center gap-1"
                >
                  <i className="fa-solid fa-phone text-xs" />
                  {settings.phone_number}
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2.5">
              <span className="text-muted">UPI ID</span>
              <span className="font-mono text-ink-soft">{settings.upi_id || '—'}</span>
            </div>
            <div>
              <span className="text-muted block mb-1">Physical Address</span>
              <p className="m-0 whitespace-pre-line rounded-xl bg-canvas/60 p-3 text-xs text-ink-soft border border-border/60">
                {settings.address || 'No address specified.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import StatCard from '@/features/admin/dashboard/components/StatCard'

function formatDate(isoStr) {
  if (!isoStr) return 'Never'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return 'Never'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

export default function UsageTab({ shop, onNavigateTab }) {
  const metrics = shop.metrics || {}
  const storage = shop.storage || {}
  const currency = metrics.currency || shop.settings?.currency || 'INR'

  return (
    <div className="flex flex-col gap-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={metrics.total_products ?? 0}
          icon="fa-shirt"
          iconColor="text-blue-500 bg-blue-500/10"
          subtext={shop.max_products != null ? `Quota: ${metrics.total_products ?? 0} / ${shop.max_products}` : 'Catalog inventory items (Unlimited)'}
        />

        <StatCard
          label="Total Bookings"
          value={metrics.total_bookings ?? 0}
          icon="fa-calendar-check"
          iconColor="text-purple-500 bg-purple-500/10"
          subtext={shop.max_bookings != null ? `Quota: ${metrics.total_bookings ?? 0} / ${shop.max_bookings}` : 'Non-cancelled rentals (Unlimited)'}
        />

        <StatCard
          label="Completed Sales"
          value={metrics.total_sales ?? 0}
          icon="fa-receipt"
          iconColor="text-emerald-500 bg-emerald-500/10"
          subtext={shop.max_sales != null ? `Quota: ${metrics.total_sales ?? 0} / ${shop.max_sales}` : 'Direct sale orders (Unlimited)'}
        />

        <StatCard
          label="Total Revenue"
          value={formatCurrency(metrics.total_revenue, currency)}
          icon="fa-indian-rupee-sign"
          iconColor="text-amber-500 bg-amber-500/10"
          badge={currency}
          badgeVariant="accent"
          subtext="Rentals + Sales combined"
        />
      </div>

      {/* Insights Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activity & Login Telemetry */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
            <h4 className="m-0 inline-flex items-center gap-2 font-display text-base font-semibold text-ink">
              <i className="fa-solid fa-clock-rotate-left text-accent" />
              Recent System Activity
            </h4>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('activity')}
                className="cursor-pointer text-xs font-semibold text-accent hover:underline"
              >
                View full activity log →
              </button>
            )}
          </div>

          <div className="space-y-4 text-sm">
            {/* Last Login */}
            <div className="rounded-xl border border-border/60 bg-canvas/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Last Admin Login
                </span>
                <span className="text-xs font-medium text-ink-soft">
                  {formatDate(shop.last_login?.created_at)}
                </span>
              </div>
              {shop.last_login ? (
                <div className="mt-2 text-xs text-muted">
                  <div className="font-medium text-ink">
                    {shop.last_login.user_name || shop.last_login.user_email || 'User'}
                  </div>
                  {shop.last_login.ip_address && (
                    <div className="mt-0.5 font-mono text-muted">IP: {shop.last_login.ip_address}</div>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted">No recorded login yet.</div>
              )}
            </div>

            {/* Last Action */}
            <div className="rounded-xl border border-border/60 bg-canvas/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Last Recorded Event
                </span>
                <span className="text-xs font-medium text-ink-soft">
                  {formatDate(shop.last_activity?.created_at)}
                </span>
              </div>
              {shop.last_activity ? (
                <div className="mt-2 text-xs text-muted">
                  <div className="font-semibold text-ink capitalize">
                    {shop.last_activity.action || 'Activity'}
                  </div>
                  <div className="mt-0.5 text-ink-soft">
                    {shop.last_activity.summary || '—'}
                  </div>
                  {shop.last_activity.user_name && (
                    <div className="mt-1 text-[0.7rem] text-muted">
                      By {shop.last_activity.user_name} ({shop.last_activity.user_email})
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted">No recorded activity yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Storage & Resource Usage */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
            <h4 className="m-0 inline-flex items-center gap-2 font-display text-base font-semibold text-ink">
              <i className="fa-solid fa-hard-drive text-accent" />
              Storage & Media
            </h4>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 bg-canvas/50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                  Files Stored
                </span>
                <div className="font-display text-2xl font-bold text-ink">
                  {storage.file_count ?? 0}
                </div>
                <span className="text-xs text-muted mt-1 block">Product images & logos</span>
              </div>

              <div className="rounded-xl border border-border/60 bg-canvas/50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                  Disk Space
                </span>
                <div className="font-display text-2xl font-bold text-accent">
                  {storage.formatted_size || '0 B'}
                </div>
                <span className="text-xs text-muted mt-1 block">
                  {storage.total_bytes ? `${storage.total_bytes.toLocaleString()} bytes` : 'No storage used'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-canvas/30 p-4 text-xs text-muted space-y-1.5">
              <div className="flex justify-between">
                <span>Storage Category:</span>
                <span className="font-mono text-ink-soft">Tenant Isolated</span>
              </div>
              <div className="flex justify-between">
                <span>Directory Path:</span>
                <span className="font-mono text-ink-soft">/storage/uploads/{shop.slug}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

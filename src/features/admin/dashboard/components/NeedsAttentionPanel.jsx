import { Link } from 'react-router-dom'

export default function NeedsAttentionPanel({ needsAttention, loading = false }) {
  const inactiveShops = needsAttention?.inactive_shops || []
  const suspendedShops = needsAttention?.suspended_shops || []
  const highFailureShops = needsAttention?.high_failure_shops || []

  const totalIssues = inactiveShops.length + suspendedShops.length + highFailureShops.length

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-border/60" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-border/40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
        <div>
          <h3 className="m-0 font-display text-base font-semibold text-ink flex items-center gap-2">
            <i className="fa-solid fa-bell text-warn" aria-hidden="true" />
            Needs Attention
          </h3>
          <p className="m-0 text-xs text-muted mt-0.5">
            Shops or systems requiring administrative review
          </p>
        </div>

        {totalIssues > 0 ? (
          <span className="inline-flex items-center rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-bold text-warn border border-warn/20">
            {totalIssues} {totalIssues === 1 ? 'item' : 'items'}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-bold text-ok border border-ok/20">
            All Good
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        {totalIssues === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ok-bg text-ok mb-2">
              <i className="fa-solid fa-circle-check text-xl" />
            </span>
            <div className="font-semibold text-xs text-ink">Everything Operating Smoothly</div>
            <p className="m-0 text-[0.75rem] text-muted mt-1 max-w-xs">
              No suspended shops, dormant accounts, or email delivery failures detected.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Suspended Shops */}
            {suspendedShops.map((shop) => (
              <div
                key={`suspended-${shop.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn-bg/40 p-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warn-bg text-warn">
                    <i className="fa-solid fa-pause text-xs" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{shop.name}</div>
                    <div className="text-muted text-[0.7rem]">
                      Shop suspended • Owner access locked
                    </div>
                  </div>
                </div>
                <Link
                  to={`/admin/shops?status=suspended`}
                  className="shrink-0 rounded-lg border border-warn/30 bg-surface px-2.5 py-1 font-semibold text-warn hover:bg-warn hover:text-white transition-colors no-underline"
                >
                  Review
                </Link>
              </div>
            ))}

            {/* Email Failure Shops */}
            {highFailureShops.map((shop) => (
              <div
                key={`fail-${shop.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <i className="fa-solid fa-triangle-exclamation text-xs" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{shop.name}</div>
                    <div className="text-red-600 text-[0.7rem] font-medium">
                      {shop.failed_count} email delivery failure{shop.failed_count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/admin/emails?status=failed&tenantId=${encodeURIComponent(shop.id)}`}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-colors no-underline shadow-2xs"
                >
                  View Logs
                </Link>
              </div>
            ))}

            {/* Inactive Shops */}
            {inactiveShops.map((shop) => (
              <div
                key={`inactive-${shop.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-canvas/60 p-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted border border-border">
                    <i className="fa-solid fa-moon text-xs" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{shop.name}</div>
                    <div className="text-muted text-[0.7rem]">
                      No sign-in for {shop.days_inactive} days
                    </div>
                  </div>
                </div>
                <Link
                  to={`/admin/shops/${shop.slug}/edit`}
                  className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1 font-semibold text-ink hover:bg-canvas transition-colors no-underline"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0
  if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`
  }
  if (currency === 'USD') {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`
  }
  return `${currency} ${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    suspended: 'bg-amber-50 text-amber-700 border-amber-200',
    deleted: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold capitalize ${
        styles[status] || 'bg-canvas text-muted border-border'
      }`}
    >
      {status}
    </span>
  )
}

export default function TopShopsTable({ shops = [], loading = false, rangeLabel = 'Selected Period' }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="h-5 w-40 animate-pulse rounded bg-border/60" />
          <div className="h-4 w-24 animate-pulse rounded bg-border/40" />
        </div>
        <div className="space-y-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-border/40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 px-5 py-4">
        <div>
          <h3 className="m-0 font-display text-base font-semibold text-ink flex items-center gap-2">
            <i className="fa-solid fa-trophy text-accent" aria-hidden="true" />
            Top Performing Shops
          </h3>
          <p className="m-0 text-xs text-muted mt-0.5">
            Ranked by order activity & revenue ({rangeLabel})
          </p>
        </div>

        <Link
          to="/admin/shops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline no-underline"
        >
          <span>All shops</span>
          <i className="fa-solid fa-arrow-right text-[0.65rem]" aria-hidden="true" />
        </Link>
      </div>

      {shops.length === 0 ? (
        <div className="p-8 text-center my-auto">
          <i className="fa-solid fa-chart-line text-2xl text-muted/40 mb-2 block" />
          <p className="m-0 text-xs text-muted">No shop activity recorded in this period.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-canvas/70 font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Shop</th>
                  <th className="px-4 py-3 text-center">Rentals</th>
                  <th className="px-4 py-3 text-center">Sales</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {shops.map((shop, idx) => (
                  <tr key={shop.id || shop.slug} className="hover:bg-canvas/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate max-w-[180px]" title={shop.name}>
                            {shop.name}
                          </div>
                          <div className="text-[0.7rem] text-muted flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{shop.slug}</span>
                            <StatusBadge status={shop.status} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-ink">
                      {shop.booking_count}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-ink">
                      {shop.sale_count}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink">
                      {formatCurrency(shop.revenue, shop.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/shops/${shop.slug}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-canvas px-2.5 py-1 text-xs font-semibold text-ink hover:bg-accent hover:text-white transition-colors no-underline"
                      >
                        <span>Manage</span>
                        <i className="fa-solid fa-angle-right text-[0.65rem]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="sm:hidden divide-y divide-border/60">
            {shops.map((shop, idx) => (
              <div key={shop.id || shop.slug} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/10 text-[0.65rem] font-bold text-accent">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-ink truncate">{shop.name}</span>
                  </div>
                  <StatusBadge status={shop.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-canvas/60 p-2.5 text-center text-xs">
                  <div>
                    <div className="text-[0.65rem] text-muted uppercase">Rentals</div>
                    <div className="font-bold text-ink mt-0.5">{shop.booking_count}</div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-muted uppercase">Sales</div>
                    <div className="font-bold text-ink mt-0.5">{shop.sale_count}</div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-muted uppercase">Revenue</div>
                    <div className="font-bold text-ink mt-0.5 text-[0.72rem]">
                      {formatCurrency(shop.revenue, shop.currency)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link
                    to={`/admin/shops/${shop.slug}/edit`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent no-underline hover:underline"
                  >
                    <span>Manage Shop</span>
                    <i className="fa-solid fa-arrow-right text-[0.65rem]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

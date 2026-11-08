import { Link } from 'react-router-dom'

export default function EmailHealthCard({ emailHealth, loading = false }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="h-5 w-36 animate-pulse rounded bg-border/60" />
        <div className="mt-4 h-24 w-full animate-pulse rounded-xl bg-border/40" />
      </div>
    )
  }

  const {
    total = 0,
    sent = 0,
    failed = 0,
    pending = 0,
    simulated = 0,
    failure_rate = 0,
    success_rate = 100,
  } = emailHealth || {}

  const attempted = sent + failed
  const sentPct = attempted > 0 ? Math.round((sent / attempted) * 100) : 100
  const failedPct = attempted > 0 ? 100 - sentPct : 0

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="m-0 font-display text-base font-semibold text-ink flex items-center gap-2">
            <i className="fa-solid fa-envelope-circle-check text-accent" aria-hidden="true" />
            Transactional Email Health
          </h3>
          <p className="m-0 text-xs text-muted mt-0.5">
            Delivery metrics & failure rate monitoring
          </p>
        </div>

        <Link
          to="/admin/emails"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline no-underline"
        >
          <span>Open Email Logs</span>
          <i className="fa-solid fa-arrow-right text-[0.65rem]" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="rounded-xl border border-border/60 bg-canvas/60 p-3">
          <div className="text-[0.7rem] font-semibold text-muted uppercase">Total Volume</div>
          <div className="mt-1 font-display text-xl font-bold text-ink">{total}</div>
        </div>

        {/* Sent */}
        <div className="rounded-xl border border-ok/20 bg-ok-bg/30 p-3">
          <div className="text-[0.7rem] font-semibold text-ok uppercase">Delivered / Sent</div>
          <div className="mt-1 font-display text-xl font-bold text-ok">{sent}</div>
        </div>

        {/* Failed */}
        <Link
          to={failed > 0 ? `/emails?status=failed` : `/emails`}
          className="rounded-xl border border-red-200 bg-red-50/50 p-3 no-underline transition-all hover:border-red-300 block"
        >
          <div className="text-[0.7rem] font-semibold text-red-700 uppercase flex items-center justify-between">
            <span>Failed</span>
            {failed > 0 && <i className="fa-solid fa-arrow-up-right-from-square text-[0.65rem]" />}
          </div>
          <div className="mt-1 font-display text-xl font-bold text-red-600">{failed}</div>
        </Link>

        {/* Failure Rate */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-[0.7rem] font-semibold text-slate-500 uppercase">Failure Rate</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-display text-xl font-bold ${
                failure_rate > 5 ? 'text-red-600' : failure_rate > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {attempted > 0 ? `${failure_rate}%` : '0%'}
            </span>
            <span className="text-[0.65rem] text-slate-500">
              ({success_rate}% success)
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Sub-notes */}
      {attempted > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 flex">
            <div
              style={{ width: `${sentPct}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Sent: ${sent} (${sentPct}%)`}
            />
            {failedPct > 0 && (
              <div
                style={{ width: `${failedPct}%` }}
                className="bg-red-500 h-full transition-all duration-500"
                title={`Failed: ${failed} (${failedPct}%)`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between text-[0.68rem] text-muted">
            <span>
              * Failure rate excludes {simulated} simulated and {pending} pending emails.
            </span>
            {failed > 0 && (
              <Link
                to="/admin/emails?status=failed"
                className="text-danger font-semibold hover:underline no-underline"
              >
                Inspect {failed} failed email{failed > 1 ? 's' : ''} →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

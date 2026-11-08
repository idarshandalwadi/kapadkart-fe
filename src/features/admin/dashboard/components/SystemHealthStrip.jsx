export default function SystemHealthStrip({ health, loading, onRefresh }) {
  const isDegraded = health?.status === 'degraded'
  const isDown = health?.status === 'down'

  const overallStatusPill = () => {
    if (loading && !health) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-muted border border-border">
          <i className="fa-solid fa-spinner fa-spin text-[0.7rem]" />
          Checking system...
        </span>
      )
    }
    if (isDown) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-3 py-1 text-xs font-semibold text-danger border border-danger/30">
          <i className="fa-solid fa-circle-xmark text-[0.7rem]" />
          System Outage
        </span>
      )
    }
    if (isDegraded) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 text-xs font-semibold text-warn border border-warn/30">
          <i className="fa-solid fa-triangle-exclamation text-[0.7rem]" />
          Degraded Performance
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-xs font-semibold text-ok border border-ok/30">
        <i className="fa-solid fa-circle-check text-[0.7rem]" />
        All Systems Operational
      </span>
    )
  }

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m ${seconds % 60}s`
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-server text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">System Infrastructure</span>
          </div>
          {overallStatusPill()}
        </div>

        <div className="flex items-center gap-3">
          {health?.timestamp && (
            <span className="text-xs text-muted">
              Updated: {new Date(health.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:bg-border/60 transition-colors disabled:opacity-50 min-h-[36px]"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin text-accent' : ''}`} />
            <span>{loading ? 'Checking...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
        {/* API Check */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-canvas/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-ok shrink-0 animate-pulse" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink">API Gateway</div>
              <div className="text-[0.7rem] text-muted truncate">
                Uptime: {formatUptime(health?.api?.uptime_seconds)}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center rounded-md bg-ok-bg px-2 py-0.5 text-[0.7rem] font-bold text-ok">
            200 OK
          </span>
        </div>

        {/* Database Check */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-canvas/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`flex h-2.5 w-2.5 rounded-full shrink-0 ${
                health?.database?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">PostgreSQL Database</div>
              <div className="text-[0.7rem] text-slate-500 truncate">
                {health?.database?.status === 'ok'
                  ? `Latency: ${health?.database?.latency_ms ?? 0} ms`
                  : health?.database?.error || 'Connection Failed'}
              </div>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.7rem] font-bold ${
              health?.database?.status === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {health?.database?.status === 'ok' ? 'Connected' : 'Error'}
          </span>
        </div>

        {/* SMTP Mailer Check */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-canvas/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`flex h-2.5 w-2.5 rounded-full shrink-0 ${
                health?.smtp?.status === 'ok'
                  ? 'bg-emerald-500'
                  : health?.smtp?.status === 'degraded'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">SMTP Mailer</div>
              <div className="text-[0.7rem] text-slate-500 truncate">
                {health?.smtp?.provider
                  ? `${health.smtp.provider.toUpperCase()} (${health.smtp.host || 'active'})`
                  : 'Not Configured'}
              </div>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.7rem] font-bold ${
              health?.smtp?.status === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : health?.smtp?.status === 'degraded'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {health?.smtp?.status === 'ok'
              ? 'Verified'
              : health?.smtp?.status === 'degraded'
              ? 'Degraded'
              : 'Failed'}
          </span>
        </div>
      </div>
    </div>
  )
}

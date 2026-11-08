import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getEmailLogs } from '@/features/admin/emails/api'

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

function StatusBadge({ status }) {
  const styles = {
    sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    simulated: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  const icons = {
    sent: 'fa-circle-check',
    failed: 'fa-circle-xmark',
    pending: 'fa-clock',
    simulated: 'fa-vial',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[status] || 'bg-canvas text-muted border-border'
      }`}
    >
      <i className={`fa-solid ${icons[status] || 'fa-circle'} text-[0.65rem]`} />
      {status}
    </span>
  )
}

function TemplateBadge({ template }) {
  const labels = {
    welcome: 'Welcome Email',
    welcome_shop: 'Shop Welcome',
    account_suspended: 'Account Suspended',
    account_updated: 'Profile Updated',
    password_reset_otp: 'Password Reset OTP',
    password_reset_success: 'Reset Confirmed',
    system_test: 'System Test',
    custom: 'Custom Email',
  }
  return (
    <span className="inline-flex items-center rounded-md bg-canvas px-2 py-0.5 text-[0.75rem] font-medium text-ink-soft">
      {labels[template] || template || 'Custom'}
    </span>
  )
}

function EmailDetailModal({ log, onClose }) {
  if (!log) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <i className="fa-solid fa-envelope-open-text text-lg" />
            </div>
            <div>
              <h3 className="m-0 font-display text-lg font-semibold text-ink">Email Log Details</h3>
              <p className="m-0 text-xs text-muted">ID: {log.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-canvas/60 p-4">
            <div>
              <span className="text-xs font-medium text-muted">Status</span>
              <div className="mt-1">
                <StatusBadge status={log.status} />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Provider</span>
              <p className="mt-1 font-mono text-xs font-semibold text-ink capitalize">
                {log.provider}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Sent / Attempted</span>
              <p className="mt-1 font-mono text-xs text-ink">
                {formatDate(log.sent_at || log.created_at)}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Template</span>
              <div className="mt-1">
                <TemplateBadge template={log.template_name} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-muted">Recipient (To)</span>
              <p className="mt-0.5 font-mono text-xs text-ink">{log.to_address}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Subject</span>
              <p className="mt-0.5 font-medium text-ink">{log.subject}</p>
            </div>
            {log.message_id && (
              <div>
                <span className="text-xs font-medium text-muted">Message ID</span>
                <p className="mt-0.5 font-mono text-xs text-ink-soft">{log.message_id}</p>
              </div>
            )}
          </div>

          {log.error_message && (
            <div className="rounded-xl border border-danger-text/25 bg-danger-bg p-4 text-danger-text">
              <span className="text-xs font-bold uppercase tracking-wider block mb-1">
                Delivery Error
              </span>
              <pre className="m-0 whitespace-pre-wrap font-mono text-xs">
                {log.error_message}
              </pre>
            </div>
          )}

          {log.metadata && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Metadata</span>
              <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-canvas p-3 font-mono text-xs text-ink-soft">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border/80 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-canvas px-4 py-2 text-xs font-semibold text-ink-soft border border-border hover:bg-border/40"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmailsTab({ tenantId }) {
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const load = async (pageToLoad = page) => {
    if (!tenantId) return
    setLoading(true)
    try {
      const res = await getEmailLogs({
        tenantId,
        page: pageToLoad,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search,
      })
      setData(res || { items: [], total: 0, totalPages: 1, page: 1, limit: 20 })
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to load email logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, statusFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load(1)
  }

  const items = data.items || []

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-2 max-w-lg">
          <div className="relative flex-1 min-w-[200px]">
            <i
              className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search recipient or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-3.5 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-soft focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="simulated">Simulated</option>
          </select>

          <button
            type="button"
            onClick={() => load(page)}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas transition-colors"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Emails Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted">
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            Loading email logs…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fa-solid fa-envelope-circle-check text-3xl text-muted/40 mb-3" />
            <p className="m-0 text-sm text-muted">No email logs found for this shop.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Recipient (To)</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Template</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-ink">
                      {log.to_address}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink max-w-xs truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-4 py-3.5">
                      <TemplateBadge template={log.template_name} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted">
                      {formatDate(log.sent_at || log.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="cursor-pointer rounded-lg border border-border bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-border/40 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} total emails)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={data.page <= 1 || loading}
                onClick={() => {
                  const p = Math.max(1, data.page - 1)
                  setPage(p)
                  load(p)
                }}
                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 font-semibold text-ink-soft hover:bg-canvas disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= data.totalPages || loading}
                onClick={() => {
                  const p = Math.min(data.totalPages, data.page + 1)
                  setPage(p)
                  load(p)
                }}
                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 font-semibold text-ink-soft hover:bg-canvas disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <EmailDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}

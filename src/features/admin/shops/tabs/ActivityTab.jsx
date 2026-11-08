import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getShopActivity } from '@/features/admin/shops/api'

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

function ActionBadge({ action }) {
  const normalized = String(action || '').toLowerCase()
  let color = 'bg-canvas text-muted border-border'
  let icon = 'fa-circle-info'

  if (normalized.includes('login') || normalized.includes('auth')) {
    color = 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
    icon = 'fa-right-to-bracket'
  } else if (normalized.includes('create') || normalized.includes('provision') || normalized.includes('add')) {
    color = 'bg-ok-bg text-ok border-ok/20'
    icon = 'fa-plus'
  } else if (normalized.includes('update') || normalized.includes('edit')) {
    color = 'bg-accent/10 text-accent border-accent/20'
    icon = 'fa-pen'
  } else if (normalized.includes('delete') || normalized.includes('remove') || normalized.includes('suspend')) {
    color = 'bg-danger-bg text-danger border-danger/20'
    icon = 'fa-trash'
  } else if (normalized.includes('booking') || normalized.includes('sale') || normalized.includes('payment')) {
    color = 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    icon = 'fa-receipt'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${color}`}
    >
      <i className={`fa-solid ${icon} text-[0.65rem]`} />
      {action}
    </span>
  )
}

function ActivityDetailModal({ item, onClose }) {
  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <i className="fa-solid fa-list-check text-lg" />
            </div>
            <div>
              <h3 className="m-0 font-display text-lg font-semibold text-ink">Activity Log Details</h3>
              <p className="m-0 text-xs text-muted">ID: {item.id}</p>
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
              <span className="text-xs font-medium text-muted">Action</span>
              <div className="mt-1">
                <ActionBadge action={item.action} />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Timestamp</span>
              <p className="mt-1 font-mono text-xs font-medium text-ink">
                {formatDate(item.created_at)}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">User</span>
              <p className="mt-1 text-ink font-medium">
                {item.user_name || item.user_email || '—'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">IP & Device</span>
              <p className="mt-1 text-ink-soft text-xs font-mono">
                {item.ip_address || '—'} {item.device_type ? `(${item.device_type})` : ''}
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Summary</span>
            <p className="mt-1 text-ink rounded-xl border border-border bg-canvas/30 p-3">
              {item.summary || 'No summary'}
            </p>
          </div>

          {item.changes && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">State Changes</span>
              <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-canvas p-3 font-mono text-xs text-ink-soft">
                {JSON.stringify(item.changes, null, 2)}
              </pre>
            </div>
          )}

          {item.metadata && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Metadata</span>
              <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-canvas p-3 font-mono text-xs text-ink-soft">
                {JSON.stringify(item.metadata, null, 2)}
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

export default function ActivityTab({ slug }) {
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)

  const load = async (pageToLoad = page) => {
    setLoading(true)
    try {
      const res = await getShopActivity(slug, {
        page: pageToLoad,
        limit: 20,
        search,
        action: actionFilter !== 'all' ? actionFilter : undefined,
      })
      setData(res || { items: [], total: 0, totalPages: 1, page: 1, limit: 20 })
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, actionFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    load(1)
  }

  const items = data.items || []

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-wrap items-center gap-2 max-w-lg">
          <div className="relative flex-1 min-w-[200px]">
            <i
              className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search activity summary, user, IP…"
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-soft focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="login">Logins</option>
            <option value="create">Creates</option>
            <option value="update">Updates</option>
            <option value="delete">Deletions</option>
            <option value="booking">Bookings</option>
            <option value="sale">Sales</option>
            <option value="payment">Payments</option>
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

      {/* Activity Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted">
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            Loading activity stream…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fa-solid fa-clock-rotate-left text-3xl text-muted/40 mb-3" />
            <p className="m-0 text-sm text-muted">No activity records found for this shop.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Summary</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">IP / Device</th>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <ActionBadge action={item.action} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink max-w-xs truncate" title={item.summary}>
                      {item.summary || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="font-medium text-ink">{item.user_name || 'System'}</div>
                      <div className="text-[0.7rem] text-muted font-mono">{item.user_email || ''}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted">
                      {item.ip_address || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
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

        {/* Pagination Bar */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} total events)
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

      <ActivityDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  )
}

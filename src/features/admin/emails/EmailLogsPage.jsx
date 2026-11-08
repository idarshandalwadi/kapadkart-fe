import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getEmailLogs,
  getEmailStats,
  getProviderStatus,
  testSmtpConnection,
} from './api'
import { listShops } from '@/features/admin/shops/api'

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
      <i className={`fa-solid ${icons[status] || 'fa-circle'} text-[0.65rem]`} aria-hidden="true" />
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

function LogDetailModal({ log, onClose }) {
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
              <div className="mt-1 font-semibold uppercase text-ink">
                {log.provider || 'SMTP'}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Created At</span>
              <div className="mt-1 text-ink">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted">Sent At</span>
              <div className="mt-1 text-ink">
                {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Sender (From)</span>
              <div className="mt-1 rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink">
                {log.from_address}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Recipient (To)</span>
              <div className="mt-1 rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink font-semibold">
                {log.to_address}
              </div>
            </div>

            {log.cc && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">CC</span>
                <div className="mt-1 rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink">
                  {log.cc}
                </div>
              </div>
            )}

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Subject</span>
              <div className="mt-1 rounded-lg border border-border bg-canvas px-3 py-2 text-ink">
                {log.subject}
              </div>
            </div>

            {log.message_id && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Message ID</span>
                <div className="mt-1 rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-xs text-muted break-all">
                  {log.message_id}
                </div>
              </div>
            )}

            {log.tenant && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Associated Shop</span>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-ink">
                  <i className="fa-solid fa-store text-accent" />
                  <span className="font-semibold">{log.tenant.name}</span>
                  <span className="text-xs text-muted">({log.tenant.slug})</span>
                </div>
              </div>
            )}

            {log.error_message && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-danger-text">Error Trace</span>
                <div className="mt-1 rounded-lg border border-danger-text/25 bg-danger-bg p-3 font-mono text-xs font-medium text-danger-text break-words">
                  {log.error_message}
                </div>
              </div>
            )}

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Metadata</span>
                <pre className="mt-1 max-h-36 overflow-x-auto rounded-lg border border-border bg-canvas p-3 font-mono text-xs text-ink">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-canvas px-4 py-2 text-sm font-semibold text-ink hover:bg-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmailLogsPage() {
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'
  const initialTenantId = searchParams.get('tenantId') || ''

  const [logs, setLogs] = useState([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState(initialTenantId)
  const [templateFilter, setTemplateFilter] = useState('')
  const [shops, setShops] = useState([])
  const [stats, setStats] = useState(null)
  const [providerInfo, setProviderInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    const urlStatus = searchParams.get('status') || 'all'
    const urlTenantId = searchParams.get('tenantId') || ''
    setStatusFilter(urlStatus)
    setTenantFilter(urlTenantId)
  }, [searchParams])

  const loadData = async () => {
    setLoading(true)
    try {
      const [logsData, statsData, providerData, shopsData] = await Promise.all([
        getEmailLogs({
          page,
          limit: 15,
          status: statusFilter,
          search: search.trim() || undefined,
          tenantId: tenantFilter || undefined,
          templateName: templateFilter || undefined,
        }),
        getEmailStats({ tenantId: tenantFilter || undefined }),
        getProviderStatus(),
        listShops({ includeDeleted: false }).catch(() => []),
      ])

      setLogs(logsData.items || [])
      setTotalLogs(logsData.total || 0)
      setTotalPages(logsData.totalPages || 1)
      setStats(statsData)
      setProviderInfo(providerData)
      if (shopsData?.length) setShops(shopsData)
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to load email logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, tenantFilter, templateFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    loadData()
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await testSmtpConnection()
      if (res.data?.connected) {
        toast.success(`SMTP connection verified successfully (${res.data.provider || 'smtp'})`)
      } else {
        toast.error(`SMTP connection failed: ${res.data?.error || 'Unknown error'}`)
      }
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Connection test failed')
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 border-b border-border/60 pb-3 sm:pb-4">
        <div className="min-w-0">
          <h2 className="m-0 inline-flex items-center gap-2 font-display text-lg sm:text-2xl font-semibold tracking-[-0.02em] text-ink">
            <i className="fa-solid fa-envelope text-accent text-base sm:text-xl" aria-hidden="true" />
            <span>Email Logs & Delivery</span>
            {totalLogs > 0 && (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-muted border border-border">
                {totalLogs}
              </span>
            )}
          </h2>
          <p className="mt-0.5 hidden text-xs text-muted sm:block">
            Monitor email delivery events, SMTP status, and transmission diagnostics across all shops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
            title="Test SMTP Connection"
          >
            <i className={`fa-solid ${testingConnection ? 'fa-spinner fa-spin' : 'fa-plug-circle-check'} text-xs`} />
            <span className="hidden xs:inline">{testingConnection ? 'Testing...' : 'Test SMTP'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-50"
            title="Refresh logs"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''} text-xs`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards - Compact Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border/80 bg-surface p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] sm:text-xs font-semibold text-muted uppercase tracking-wider">Total</span>
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <i className="fa-solid fa-paper-plane text-[0.65rem] sm:text-xs" />
            </span>
          </div>
          <div className="mt-1 font-display text-lg sm:text-2xl font-bold text-ink">
            {stats?.total ?? '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] sm:text-xs font-semibold text-ok uppercase tracking-wider">Sent</span>
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-ok-bg text-ok">
              <i className="fa-solid fa-circle-check text-[0.65rem] sm:text-xs" />
            </span>
          </div>
          <div className="mt-1 font-display text-lg sm:text-2xl font-bold text-ink">
            {stats?.sent ?? '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] sm:text-xs font-semibold text-danger uppercase tracking-wider">Failed</span>
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-danger-bg text-danger">
              <i className="fa-solid fa-triangle-exclamation text-[0.65rem] sm:text-xs" />
            </span>
          </div>
          <div className="mt-1 font-display text-lg sm:text-2xl font-bold text-ink">
            {stats?.failed ?? '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] sm:text-xs font-semibold text-muted uppercase tracking-wider">Success</span>
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <i className="fa-solid fa-chart-pie text-[0.65rem] sm:text-xs" />
            </span>
          </div>
          <div className="mt-1 font-display text-lg sm:text-2xl font-bold text-ink">
            {stats?.successRate ?? '100%'}
          </div>
        </div>
      </div>

      {/* Provider Info Banner - Compact */}
      {providerInfo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-[0.7rem] sm:text-xs text-ink-soft">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex h-2 w-2 rounded-full bg-ok" />
            <span className="font-semibold text-ink">Mailer:</span>
            <span className="font-bold uppercase text-accent">{providerInfo.provider}</span>
            <span className="text-muted">({providerInfo.host}:{providerInfo.port})</span>
          </div>
          <div className="flex items-center gap-3 text-muted">
            <span>From: <strong className="text-ink">{providerInfo.from}</strong></span>
          </div>
        </div>
      )}

      {/* Filters & Search - Sleek Toolbar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-surface p-2.5 sm:p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Scrollable Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 pb-0.5">
            {['all', 'sent', 'failed', 'pending'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab)
                  setPage(1)
                }}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-canvas text-ink-soft hover:bg-border/60 hover:text-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Shop and Template filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={tenantFilter}
              onChange={(e) => {
                setTenantFilter(e.target.value)
                setPage(1)
              }}
              className="max-w-[110px] sm:max-w-[160px] truncate rounded-lg border border-border bg-canvas px-2 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
              title="Filter by shop"
            >
              <option value="">All Shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={templateFilter}
              onChange={(e) => {
                setTemplateFilter(e.target.value)
                setPage(1)
              }}
              className="max-w-[110px] sm:max-w-[160px] truncate rounded-lg border border-border bg-canvas px-2 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
              title="Filter by template"
            >
              <option value="">All Templates</option>
              <option value="welcome">Welcome</option>
              <option value="welcome_shop">Shop Welcome</option>
              <option value="account_suspended">Suspended</option>
              <option value="account_updated">Profile Updated</option>
              <option value="password_reset_otp">Reset OTP</option>
              <option value="password_reset_success">Reset Confirmed</option>
              <option value="system_test">Test</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted" />
            <input
              type="text"
              placeholder="Search recipient, subject, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-canvas py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-soft transition-colors shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Logs Presentation: Desktop Table + Mobile Responsive Cards */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-sm">
        {/* Mobile View (< md) */}
        <div className="block md:hidden divide-y divide-border/60">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted">
              <i className="fa-solid fa-spinner fa-spin mr-2 text-accent" />
              Loading email audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              <i className="fa-solid fa-inbox block text-xl mb-1 text-muted/60" />
              No email logs found.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-3 hover:bg-canvas/40 cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-ink truncate">{log.to_address}</span>
                  <StatusBadge status={log.status} />
                </div>
                <div className="text-xs text-ink-soft truncate font-medium">
                  {log.subject || '(no subject)'}
                </div>
                <div className="flex items-center justify-between text-[0.7rem] text-muted pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <TemplateBadge template={log.template_name} />
                    {log.tenant && <span className="truncate max-w-[100px] text-ink font-medium">· {log.tenant.name}</span>}
                  </div>
                  <span>
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-canvas/70 font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <i className="fa-solid fa-spinner fa-spin mr-2 text-accent" />
                    Loading email audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <i className="fa-solid fa-inbox block text-2xl mb-2 text-muted/60" />
                    No email logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {log.to_address}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-ink-soft" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TemplateBadge template={log.template_name} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {log.tenant ? (
                        <span className="font-medium text-ink">{log.tenant.name}</span>
                      ) : (
                        <span className="italic text-muted/80">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="cursor-pointer rounded-lg border border-border bg-canvas px-2.5 py-1 text-xs font-semibold text-ink hover:bg-accent hover:text-white transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 px-3 py-2.5 sm:px-4 sm:py-3 text-xs text-muted">
            <div>
              <span className="hidden sm:inline">Showing page </span><strong className="text-ink">{page}</strong>/<strong className="text-ink">{totalPages}</strong> <span className="hidden sm:inline">({totalLogs} logs)</span>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="cursor-pointer rounded-lg border border-border bg-canvas px-2.5 py-1 sm:px-3 sm:py-1.5 font-semibold text-ink disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="cursor-pointer rounded-lg border border-border bg-canvas px-2.5 py-1 sm:px-3 sm:py-1.5 font-semibold text-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}

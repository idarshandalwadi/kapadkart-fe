import { useCallback, useEffect, useState, Fragment } from 'react'
import { toast } from 'sonner'
import { fetchActivities } from '@/features/activity/api/activity'
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
  ACTIVITY_LIMIT_OPTIONS,
  ACTIVITY_TABLE_COLUMNS,
  actionBadgeClass,
  formatActivityAction,
  formatActivityEntity,
} from '@/features/activity/constants/activity'
import ColumnPicker from '@/shared/components/ColumnPicker'
import FormSelect from '@/shared/components/FormSelect'
import { useColumnVisibility, isColumnVisible } from '@/shared/hooks/useColumnVisibility'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/utils/cn'
import { useTenant } from '@/shared/tenant/TenantContext'
import DateInput from '@/shared/components/DateInput'
import ListingFilterBar from '@/shared/components/ListingFilterBar'
import Pagination from '@/shared/components/Pagination'


function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ActivityDetails({ row }) {
  const hasDeviceContext = Boolean(
    row.ip_address ||
      row.browser_name ||
      row.os_name ||
      row.device_type ||
      row.request_id ||
      row.request_method ||
      row.request_path,
  )
  const hasChanges = row.changes && Object.keys(row.changes).length > 0
  const hasMeta = row.metadata && Object.keys(row.metadata).length > 0

  if (!hasDeviceContext && !hasChanges && !hasMeta) {
    return <p className="m-0 text-sm text-text-secondary">No additional details recorded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {hasDeviceContext && (
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-sm">
          <h4 className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
            <i className="fa-solid fa-shield-halved mr-1.5 text-accent-text" />
            Device & Request Context
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                IP Address
              </span>
              <span className="font-mono text-xs font-semibold text-text">
                {row.ip_address || '—'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                Browser
              </span>
              <span className="text-xs font-semibold text-text">
                {row.browser_name ? `${row.browser_name} ${row.browser_version || ''}`.trim() : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                Operating System
              </span>
              <span className="text-xs font-semibold text-text">
                {row.os_name ? `${row.os_name} ${row.os_version || ''}`.trim() : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                Device
              </span>
              <span className="text-xs font-semibold text-text capitalize">
                {row.device_type || row.device_name || '—'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                HTTP Request
              </span>
              <span className="font-mono text-xs font-semibold text-text truncate">
                {row.request_method ? `${row.request_method} ${row.request_path || ''}`.trim() : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                Request ID
              </span>
              <span className="font-mono text-[0.7rem] text-text-muted truncate" title={row.request_id || ''}>
                {row.request_id ? `${row.request_id.slice(0, 8)}…` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {hasChanges && (
          <div>
            <h4 className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              Data snapshot
            </h4>
            <pre className="m-0 max-h-80 overflow-auto rounded-xl border border-border bg-surface-muted p-3 font-mono text-xs leading-relaxed text-text">
              {JSON.stringify(row.changes, null, 2)}
            </pre>
          </div>
        )}
        {hasMeta && (
          <div>
            <h4 className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              Custom metadata
            </h4>
            <pre className="m-0 max-h-80 overflow-auto rounded-xl border border-border bg-surface-muted p-3 font-mono text-xs leading-relaxed text-text">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const { slug } = useTenant()
  const {
    visibleKeys,
    toggle: toggleColumn,
    showAll: showAllColumns,
  } = useColumnVisibility(`kk:table-columns:${slug}:activity`, ACTIVITY_TABLE_COLUMNS)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const show = (key) => isColumnVisible(visibleKeys, key)
  const columnCount = ACTIVITY_TABLE_COLUMNS.filter((column) => show(column.key)).length + 1

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json = await fetchActivities({
        page,
        limit,
        action,
        entity_type: entityType,
        from,
        to,
        search: debouncedSearch.trim(),
      })
      setRows(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch (err) {
      const message = err.message || 'Failed to load activity'
      setError(message)
      setRows([])
      setPagination(null)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [page, limit, action, entityType, from, to, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [limit, action, entityType, from, to, debouncedSearch])

  const hasFilters = Boolean(search || action || entityType || from || to)
  const activeChips = []
  if (action) {
    const actObj = ACTIVITY_ACTION_OPTIONS.find((o) => o.value === action)
    activeChips.push({ key: 'action', label: `Action: ${actObj?.label || action}`, onRemove: () => setAction('') })
  }
  if (entityType) {
    const entObj = ACTIVITY_ENTITY_OPTIONS.find((o) => o.value === entityType)
    activeChips.push({ key: 'module', label: `Module: ${entObj?.label || entityType}`, onRemove: () => setEntityType('') })
  }
  if (from) {
    activeChips.push({ key: 'from', label: `From: ${from}`, onRemove: () => setFrom('') })
  }
  if (to) {
    activeChips.push({ key: 'to', label: `To: ${to}`, onRemove: () => setTo('') })
  }
  const activeFilterCount = (action ? 1 : 0) + (entityType ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0)

  const clearAllFilters = () => {
    setSearch('')
    setAction('')
    setEntityType('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] animate-fade-up pb-12">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Administration</p>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Activity Tracker</h1>
            {pagination && (
              <span className="page-count">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="page-lead">
            Immutable audit log of user actions — who changed what, when, and from what device.
          </p>
        </div>
      </div>

      <ListingFilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="User, summary, IP, request ID…"
        activeFilterCount={activeFilterCount}
        activeChips={activeChips}
        onClearAll={hasFilters ? clearAllFilters : null}
      >
        <div className="filter-field">
          <label htmlFor="activity-action">Action</label>
          <FormSelect
            id="activity-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={ACTIVITY_ACTION_OPTIONS}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="activity-module">Module</label>
          <FormSelect
            id="activity-module"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            options={ACTIVITY_ENTITY_OPTIONS}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="activity-from">From</label>
          <DateInput
            id="activity-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="activity-to">To</label>
          <DateInput
            id="activity-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </ListingFilterBar>

      <section className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border p-2 sm:px-4 sm:py-2.5 bg-surface-muted/40">
          <p className="m-0 text-xs font-semibold text-text-secondary">
            {loading
              ? 'Loading…'
              : `${pagination?.total ?? 0} event${pagination?.total === 1 ? '' : 's'}`}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-[7.5rem] sm:w-[10.75rem]">
              <ColumnPicker
                id="activity-columns"
                columns={ACTIVITY_TABLE_COLUMNS}
                visibleKeys={visibleKeys}
                onToggle={toggleColumn}
                onShowAll={showAllColumns}
              />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <span className="hidden xs:inline">Rows</span>
              <FormSelect
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                options={ACTIVITY_LIMIT_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
              />
            </label>
          </div>
        </div>

        {error && (
          <p className="m-4 rounded-xl border border-danger-text/25 bg-danger-bg px-3 py-2 text-sm font-medium text-danger-text">
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ minWidth: `${Math.max(640, columnCount * 140)}px` }}
          >
            <thead className="border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wider text-text-secondary">
              <tr>
                {show('when') && <th className="px-4 py-3 font-semibold">When</th>}
                {show('user') && <th className="px-4 py-3 font-semibold">User</th>}
                {show('action') && <th className="px-4 py-3 font-semibold">Action</th>}
                {show('module') && <th className="px-4 py-3 font-semibold">Module</th>}
                {show('summary') && <th className="px-4 py-3 font-semibold">Summary</th>}
                <th className="px-4 py-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-10 text-center text-text-secondary">
                    <div className="empty-state">No activity recorded yet for these filters.</div>
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const open = expandedId === row.id
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-border align-top transition-colors hover:bg-surface-muted/40">
                      {show('when') && (
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-text-secondary">
                          {formatDateTime(row.created_at)}
                        </td>
                      )}
                      {show('user') && (
                        <td className="px-4 py-3">
                          <div className="font-semibold text-text">
                            {row.user_name || row.user_email || 'System / Anonymous'}
                          </div>
                          {row.user_name && row.user_email && (
                            <div className="text-xs text-text-muted">{row.user_email}</div>
                          )}
                        </td>
                      )}
                      {show('action') && (
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
                              actionBadgeClass(row.action),
                            )}
                          >
                            {formatActivityAction(row.action)}
                          </span>
                        </td>
                      )}
                      {show('module') && (
                        <td className="px-4 py-3 text-text-secondary">
                          <span className="font-medium text-text">{formatActivityEntity(row.entity_type)}</span>
                          {row.entity_id ? (
                            <span className="ml-1 text-xs font-mono text-text-muted">#{row.entity_id}</span>
                          ) : null}
                        </td>
                      )}
                      {show('summary') && (
                        <td className="max-w-[28rem] px-4 py-3 text-text font-medium">{row.summary}</td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className={cn(
                            'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                            open
                              ? 'border-accent bg-accent-soft text-accent-text'
                              : 'border-border bg-surface text-text hover:border-accent hover:text-accent-text',
                          )}
                          onClick={() => setExpandedId(open ? null : row.id)}
                        >
                          {open ? 'Hide details' : 'View context'}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t border-border bg-surface-muted/60">
                        <td colSpan={columnCount} className="px-4 py-4">
                          <ActivityDetails row={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          loading={loading}
          className="border-t border-border px-4 py-3"
        />
      </section>
    </div>
  )
}

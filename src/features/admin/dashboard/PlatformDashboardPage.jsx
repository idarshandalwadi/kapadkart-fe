import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getPlatformHealth, getPlatformSummary } from './api'
import StatCard from './components/StatCard'
import SystemHealthStrip from './components/SystemHealthStrip'
import TopShopsTable from './components/TopShopsTable'
import NeedsAttentionPanel from './components/NeedsAttentionPanel'
import EmailHealthCard from './components/EmailHealthCard'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'month', label: 'This Month' },
]

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

export default function PlatformDashboardPage() {
  const [range, setRange] = useState('30d')
  const [summary, setSummary] = useState(null)
  const [health, setHealth] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [summaryError, setSummaryError] = useState(null)

  const activeRangeRef = useRef(range)
  activeRangeRef.current = range

  const loadSummaryData = async (selectedRange = range) => {
    setLoadingSummary(true)
    setSummaryError(null)
    try {
      const data = await getPlatformSummary({ range: selectedRange })
      // Verify response is still for the active range
      if (activeRangeRef.current === selectedRange) {
        setSummary(data)
      }
    } catch (err) {
      if (err?.silent) return
      if (activeRangeRef.current === selectedRange) {
        const msg = err.message || 'Failed to load platform summary'
        setSummaryError(msg)
        toast.error(msg)
      }
    } finally {
      if (activeRangeRef.current === selectedRange) {
        setLoadingSummary(false)
      }
    }
  }

  const loadHealthData = async () => {
    setLoadingHealth(true)
    try {
      const data = await getPlatformHealth()
      setHealth(data)
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to check system health')
    } finally {
      setLoadingHealth(false)
    }
  }

  useEffect(() => {
    loadSummaryData(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  useEffect(() => {
    loadHealthData()
  }, [])

  const shopOverview = summary?.shop_overview || {
    total_shops: summary?.total_shops,
    active_shops: summary?.active_shops,
    suspended_shops: summary?.suspended_shops,
    deleted_shops: summary?.deleted_shops,
    new_shops_this_month: summary?.new_shops_this_month,
    new_shops_last_month: summary?.new_shops_last_month ?? 0,
    inactive_shops_30d: summary?.inactive_shops_30d ?? 0,
  }
  const activity = summary?.activity || {
    total_bookings: summary?.rental_count ?? summary?.total_bookings,
    total_sales: summary?.sale_count ?? summary?.total_sales,
    total_transactions: (summary?.rental_count ?? 0) + (summary?.sale_count ?? 0),
    revenue_by_currency: summary?.total_revenue != null
      ? [{ currency: summary?.currency || 'INR', amount: summary.total_revenue, payment_count: summary.sale_count ?? 0 }]
      : [{ currency: 'INR', amount: 0, payment_count: 0 }],
  }
  const emailHealth = summary?.email_health || {
    delivery_rate: 100,
    bounce_rate: 0,
    total_sent: 0,
    total_failed: 0,
    status: 'ok',
  }
  const topShops = summary?.top_shops || []
  const needsAttention = summary?.needs_attention
  const rangeLabel = summary?.range_label || RANGE_OPTIONS.find((r) => r.value === range)?.label || '30 Days'

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 inline-flex items-center gap-3 font-display text-[2.15rem] font-semibold tracking-[-0.03em] text-ink">
            <i className="fa-solid fa-chart-pie text-accent" aria-hidden="true" />
            Platform Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted">
            Executive oversight, multi-tenant performance KPIs, and system diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/admin/shops/new"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors no-underline min-h-[38px]"
            >
              <i className="fa-solid fa-circle-plus" />
              <span>Add Shop</span>
            </Link>

            <Link
              to="/admin/shops"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas transition-colors no-underline min-h-[38px]"
            >
              <i className="fa-solid fa-store text-muted" />
              <span>Shops</span>
            </Link>

            <Link
              to="/admin/emails"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas transition-colors no-underline min-h-[38px]"
            >
              <i className="fa-solid fa-envelope text-muted" />
              <span>Emails</span>
            </Link>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors min-h-[34px] ${
                  range === opt.value
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-ink-soft hover:bg-canvas hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Health Strip */}
      <SystemHealthStrip
        health={health}
        loading={loadingHealth}
        onRefresh={loadHealthData}
      />

      {/* Summary Error Banner */}
      {summaryError && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-triangle-exclamation text-base text-red-600" />
            <span>{summaryError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadSummaryData(range)}
            className="cursor-pointer rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Shop Overview KPIs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 font-display text-base font-semibold text-ink flex items-center gap-2">
            <i className="fa-solid fa-store text-accent" />
            Shop Lifecycle Overview
          </h3>
          <span className="text-xs text-muted">Real-time tenant status</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Shops"
            value={shopOverview?.total_shops}
            icon="fa-store"
            iconColor="text-amber-700 bg-amber-500/15"
            subtext="All onboarded tenants"
            to="/admin/shops"
            loading={loadingSummary}
          />
          <StatCard
            label="Active Shops"
            value={shopOverview?.active_shops}
            icon="fa-circle-check"
            iconColor="text-emerald-700 bg-emerald-500/15"
            badge="Live"
            badgeVariant="ok"
            subtext="Operating normally"
            to="/admin/shops"
            loading={loadingSummary}
          />
          <StatCard
            label="Suspended"
            value={shopOverview?.suspended_shops}
            icon="fa-circle-pause"
            iconColor="text-amber-600 bg-amber-500/15"
            badge={shopOverview?.suspended_shops > 0 ? 'Locked' : undefined}
            badgeVariant="warn"
            subtext="Access temporarily paused"
            to="/admin/shops?status=suspended"
            loading={loadingSummary}
          />
          <StatCard
            label="Soft-Deleted"
            value={shopOverview?.deleted_shops}
            icon="fa-trash-can"
            iconColor="text-rose-700 bg-rose-500/15"
            subtext="Archived / in trash"
            to="/admin/shops?include_deleted=true"
            loading={loadingSummary}
          />
          <StatCard
            label="New This Month"
            value={shopOverview?.new_shops_this_month}
            icon="fa-user-plus"
            iconColor="text-blue-700 bg-blue-500/15"
            badge={
              shopOverview?.new_shops_last_month != null
                ? `${shopOverview.new_shops_last_month} prev mo`
                : undefined
            }
            badgeVariant="neutral"
            subtext="Recent shop signups"
            loading={loadingSummary}
          />
          <StatCard
            label="Inactive (30d+)"
            value={shopOverview?.inactive_shops_30d}
            icon="fa-clock-rotate-left"
            iconColor="text-slate-600 bg-slate-500/15"
            badge={shopOverview?.inactive_shops_30d > 0 ? 'Dormant' : undefined}
            badgeVariant="warn"
            subtext="No sign-in in 30 days"
            loading={loadingSummary}
          />
        </div>
      </div>

      {/* Section 2: Platform-wide Activity KPIs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 font-display text-base font-semibold text-ink flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-accent" />
            Platform Activity ({rangeLabel})
          </h3>
          <span className="text-xs text-muted">Excludes soft-deleted shops</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Rental Bookings"
            value={activity?.total_bookings}
            icon="fa-calendar-check"
            iconColor="text-amber-700 bg-amber-500/15"
            subtext="Active & confirmed rentals"
            loading={loadingSummary}
          />

          <StatCard
            label="Retail POS Sales"
            value={activity?.total_sales}
            icon="fa-cash-register"
            iconColor="text-blue-700 bg-blue-500/15"
            subtext="Direct counter retail sales"
            loading={loadingSummary}
          />

          <StatCard
            label="Total Orders"
            value={activity?.total_transactions}
            icon="fa-boxes-stacked"
            iconColor="text-purple-700 bg-purple-500/15"
            subtext="Combined order volume"
            loading={loadingSummary}
          />

          {/* Revenue by Currency */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Revenue Collected
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-emerald-700 bg-emerald-500/15">
                <i className="fa-solid fa-indian-rupee-sign text-sm" />
              </span>
            </div>

            <div className="mt-3">
              {loadingSummary ? (
                <div className="h-8 w-28 animate-pulse rounded bg-border/60" />
              ) : (
                <div className="space-y-1">
                  {(activity?.revenue_by_currency || [{ currency: 'INR', amount: 0, payment_count: 0 }]).map(
                    (rev) => (
                      <div key={rev.currency} className="flex items-baseline justify-between">
                        <span className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">
                          {formatCurrency(rev.amount, rev.currency)}
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          {rev.payment_count} payments
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 text-xs text-muted">
              Net collected payments (advance + final - refunds)
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Top Shops & Needs Attention Split Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TopShopsTable
            shops={topShops}
            loading={loadingSummary}
            rangeLabel={rangeLabel}
          />
        </div>

        <div className="lg:col-span-5">
          <NeedsAttentionPanel
            needsAttention={needsAttention}
            loading={loadingSummary}
          />
        </div>
      </div>

      {/* Section 4: Email Health & Delivery Metrics */}
      <EmailHealthCard
        emailHealth={emailHealth}
        loading={loadingSummary}
      />
    </div>
  )
}

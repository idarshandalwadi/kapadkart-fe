import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardSummary } from '../api/dashboard'
import { fetchSalesReports } from '@/features/sales/api/salesReports'
import BookingsChart from '@/features/bookings/components/BookingsChart'
import SalesChart from '@/features/sell/components/SalesChart'
import ReturnsSchedule from '@/features/bookings/components/ReturnsSchedule'
import { DashboardKpiSkeleton } from '@/shared/components/skeletons'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useTenant } from '@/shared/tenant/TenantContext'
import { hasAnyActiveLimit } from '@/features/dashboard/utils/dashboardLimits'
import { cn } from '@/shared/utils/cn'

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const TONE_ICON_CLASSES = {
  booking: 'bg-indigo-500/10 text-indigo-500',
  sale: 'bg-emerald-500/10 text-emerald-600',
  product: 'bg-amber-500/10 text-amber-600',
}

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function todayIsoDate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function DashboardSection({ icon, iconWrapClass, title, subtitle, children, headerRight }) {
  return (
    <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-text flex items-center gap-2 m-0">
            <span className={cn('grid size-9 place-items-center rounded-lg', iconWrapClass)}>
              <i className={cn('fa-solid text-base', icon)} />
            </span>
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs text-text-secondary mt-1 mb-0">{subtitle}</p>
          ) : null}
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  )
}

function KpiTile({ to, label, hint, icon, iconClass, valueClass, children, alert = false }) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex h-full min-h-[7.5rem] flex-col justify-between rounded-xl border p-4 no-underline shadow-xs transition-all',
        alert
          ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'
          : 'bg-surface-muted/50 border-border hover:border-accent/40 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn(
          'text-[0.7rem] font-bold uppercase tracking-wider',
          alert ? 'text-rose-600 dark:text-rose-400' : 'text-text-secondary group-hover:text-accent transition-colors',
        )}>
          {label}
        </div>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-sm', iconClass)} aria-hidden="true">
          <i className={cn('fa-solid', icon)} />
        </span>
      </div>
      <div>
        <div className={cn('font-display font-bold tracking-tight', valueClass)}>{children}</div>
        {hint ? <div className="text-xs text-text-muted mt-1">{hint}</div> : null}
      </div>
    </Link>
  )
}

function QuotaBar({ label, current, max, icon, colorClass, barClass }) {
  const isUnlimited = max === null || max === undefined || max === ''
  const maxNum = Number(max)
  const currentNum = Number(current || 0)
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((currentNum / (maxNum || 1)) * 100))
  const isLimitReached = !isUnlimited && maxNum > 0 && currentNum >= maxNum

  return (
    <div className="bg-surface-muted/50 border border-border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn('grid size-8 place-items-center rounded-lg text-sm', colorClass)}>
            <i className={cn('fa-solid', icon)} />
          </span>
          <div>
            <span className="text-xs font-bold text-text uppercase tracking-wider block">{label}</span>
            <span className="text-[0.7rem] text-text-secondary">
              {isUnlimited ? 'Unlimited plan quota' : `${currentNum} of ${maxNum} used`}
            </span>
          </div>
        </div>
        {isLimitReached ? (
          <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse">
            Quota Reached
          </span>
        ) : isUnlimited ? (
          <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Unlimited
          </span>
        ) : (
          <span className="text-[0.75rem] font-semibold text-text-secondary">
            {percentage}%
          </span>
        )}
      </div>

      <div>
        <div className="h-2 w-full bg-border/50 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500 rounded-full', isLimitReached ? 'bg-rose-500' : barClass)}
            style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  const {
    companyName,
    path,
    businessType: tenantBusinessType,
    limits: tenantLimits,
  } = useTenant()

  const rawBusinessType =
    user?.tenant?.businessType ||
    user?.tenant?.business_type ||
    tenantBusinessType ||
    'SALES_AND_RENTAL'
  const businessType = String(rawBusinessType).toUpperCase()
  const isRentalAllowed = businessType !== 'SALES'
  const isSalesAllowed = businessType !== 'RENTAL'
  const todaySalesTo = `${path('/sales')}?from=${todayIsoDate()}&to=${todayIsoDate()}&status=completed`

  const [summary, setSummary] = useState(null)
  const [chartDays, setChartDays] = useState(30)
  const [bookingsChart, setBookingsChart] = useState(null)
  const [salesChart, setSalesChart] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboardData = async () => {
    setRefreshing(true)
    try {
      const sumRes = await fetchDashboardSummary()
      setSummary(sumRes.data || null)
    } catch (err) {
      console.error('Failed to load dashboard summary:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const loadCharts = async (days) => {
    setChartLoading(true)
    setChartError(null)

    try {
      const json = await fetchSalesReports({
        chart_days: days,
        page: 1,
        limit: 1,
      })

      const bookings =
        json.data?.bookingsChart ??
        (json.data?.revenueChart
          ? {
              title: `Rentals Last ${days} Days`,
              subtitle: 'Daily rental volume',
              days: (json.data.revenueChart.days || []).map((day) => ({
                date: day.date,
                label: day.label,
                bookings: day.bookings ?? 0,
              })),
            }
          : null)

      setBookingsChart(bookings)
      setSalesChart(json.data?.salesChart ?? null)
    } catch (err) {
      setBookingsChart(null)
      setSalesChart(null)
      setChartError(err.message)
    } finally {
      setChartLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    loadCharts(chartDays)
  }, [chartDays])

  const kpis = summary?.kpis
  const limits = summary?.limits || tenantLimits || {}
  const counts = summary?.counts || {}
  const maxProducts = limits.max_products ?? limits.maxProducts ?? null
  const maxBookings = limits.max_bookings ?? limits.maxBookings ?? null
  const maxSales = limits.max_sales ?? limits.maxSales ?? null

  const hasAnyLimit = hasAnyActiveLimit({
    maxProducts,
    maxBookings,
    maxSales,
    isRentalAllowed,
    isSalesAllowed,
  })

  const quickActions = [
    ...(isRentalAllowed
      ? [
          {
            to: '/booking/add',
            title: 'New Rental',
            description: 'Create a rental booking and print a bill.',
            icon: 'fa-calendar-plus',
            tone: 'booking',
          },
        ]
      : []),
    ...(isSalesAllowed
      ? [
          {
            to: '/sales/add',
            title: 'New Sale (POS)',
            description: 'Record a direct product sale and deduct stock.',
            icon: 'fa-cash-register',
            tone: 'sale',
          },
        ]
      : []),
    {
      to: '/products/add',
      title: 'Add Product',
      description:
        isRentalAllowed && isSalesAllowed
          ? 'Add an item to your rental & sales catalog.'
          : isRentalAllowed
          ? 'Add an item to your rental inventory.'
          : 'Add an item to your sales catalog.',
      icon: 'fa-shirt',
      tone: 'product',
    },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fade-up pb-12">
      {/* HEADER */}
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">{companyName || 'KapadKart'}</p>
          <h1 className="page-title">{getTimeGreeting()}, Admin</h1>
          <p className="page-lead">
            Here's what's happening with your shop's inventory, rentals, and sales today.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={refreshing}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh dashboard metrics"
          >
            <i className={cn('fa-solid fa-arrows-rotate', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {kpis ? (
        <DashboardSection
          icon="fa-list-check"
          iconWrapClass="bg-amber-500/10 text-amber-600"
          title="Today’s snapshot"
          subtitle="Live rental, inventory, and revenue status for this shop"
        >
          <div className="space-y-5">
            <div>
              <p className="m-0 mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                Operational status
              </p>
              {isRentalAllowed ? (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Operational overview">
                  <KpiTile
                    to={`${path('/booking')}?status=pickup_today`}
                    label="Today’s booking"
                    hint="Pickups scheduled for today"
                    icon="fa-calendar-plus"
                    iconClass="bg-blue-500/10 text-blue-600"
                    valueClass="text-[1.75rem] text-blue-600 dark:text-blue-400"
                  >
                    {kpis.today_bookings ?? 0}
                  </KpiTile>

                  <KpiTile
                    to={`${path('/booking')}?status=due_today`}
                    label="Today’s return"
                    hint="Items due back today"
                    icon="fa-calendar-day"
                    iconClass="bg-amber-500/10 text-amber-600"
                    valueClass="text-[1.75rem] text-amber-600 dark:text-amber-400"
                  >
                    {kpis.returns_due_today}
                  </KpiTile>

                  <KpiTile
                    to={`${path('/booking')}?status=upcoming_delivery`}
                    label="Incoming delivery"
                    hint="Pickups in the next 15 days"
                    icon="fa-truck"
                    iconClass="bg-indigo-500/10 text-indigo-600"
                    valueClass="text-[1.75rem] text-indigo-600 dark:text-indigo-400"
                  >
                    {kpis.upcoming_deliveries ?? 0}
                  </KpiTile>

                  <KpiTile
                    to={`${path('/booking')}?status=overdue`}
                    label="Overdue returns"
                    hint={kpis.overdue_rentals > 0 ? 'Requires follow-up' : 'All returns on time'}
                    icon="fa-triangle-exclamation"
                    iconClass="bg-rose-500/10 text-rose-600"
                    valueClass={cn(
                      'text-[1.75rem]',
                      kpis.overdue_rentals > 0
                        ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                        : 'text-text',
                    )}
                    alert={kpis.overdue_rentals > 0}
                  >
                    {kpis.overdue_rentals}
                  </KpiTile>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Operational overview">
                  <KpiTile
                    to={todaySalesTo}
                    label="Today's sales"
                    hint="Completed transactions today"
                    icon="fa-receipt"
                    iconClass="bg-emerald-500/10 text-emerald-600"
                    valueClass="text-[1.75rem] text-emerald-600 dark:text-emerald-400"
                  >
                    {kpis.completed_sales_count ?? 0}
                  </KpiTile>

                  <KpiTile
                    to={`${path('/products')}?stock=available`}
                    label="Available in stock"
                    hint="Products with stock on hand"
                    icon="fa-box-open"
                    iconClass="bg-blue-500/10 text-blue-600"
                    valueClass="text-[1.75rem] text-blue-600 dark:text-blue-400"
                  >
                    {summary?.products?.available ?? 0}
                  </KpiTile>

                  <KpiTile
                    to={path('/products')}
                    label="Catalog items"
                    hint="Active sale products"
                    icon="fa-shirt"
                    iconClass="bg-indigo-500/10 text-indigo-600"
                    valueClass="text-[1.75rem] text-indigo-600 dark:text-indigo-400"
                  >
                    {counts.total_products ?? summary?.products?.total ?? 0}
                  </KpiTile>

                  <KpiTile
                    to={todaySalesTo}
                    label="Today's POS revenue"
                    hint="Direct sales collection"
                    icon="fa-cash-register"
                    iconClass="bg-amber-500/10 text-amber-600"
                    valueClass="text-[1.75rem] text-amber-600 dark:text-amber-400"
                  >
                    {formatInr(kpis.today_sales_revenue)}
                  </KpiTile>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-5">
              <p className="m-0 mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                Financial overview
              </p>
              <div
                className={cn(
                  'grid grid-cols-1 gap-3',
                  isRentalAllowed && isSalesAllowed
                    ? 'sm:grid-cols-3'
                    : 'sm:grid-cols-2',
                )}
                aria-label="Financial overview"
              >
                {isSalesAllowed && (
                  <KpiTile
                    to={todaySalesTo}
                    label="Today’s sales revenue"
                    hint={`${kpis.completed_sales_count} sales completed`}
                    icon="fa-cash-register"
                    iconClass="bg-emerald-500/10 text-emerald-600"
                    valueClass="text-[1.85rem] text-emerald-600 dark:text-emerald-400"
                  >
                    {formatInr(kpis.today_sales_revenue)}
                  </KpiTile>
                )}

                {isRentalAllowed && (
                  <KpiTile
                    to={`${path('/booking')}?status=created_today`}
                    label="Today’s rental revenue"
                    hint="Collected on bookings created today"
                    icon="fa-key"
                    iconClass="bg-amber-500/10 text-amber-600"
                    valueClass="text-[1.85rem] text-amber-600 dark:text-amber-400"
                  >
                    {formatInr(kpis.today_rental_revenue)}
                  </KpiTile>
                )}

                {isRentalAllowed && (
                  <KpiTile
                    to={`${path('/booking')}?status=outstanding`}
                    label="Outstanding due (Baki)"
                    hint="Customer receivable balance"
                    icon="fa-scale-unbalanced"
                    iconClass="bg-rose-500/10 text-rose-600"
                    valueClass={cn(
                      'text-[1.85rem]',
                      Number(kpis.total_outstanding_due) > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600',
                    )}
                    alert={Number(kpis.total_outstanding_due) > 0}
                  >
                    {formatInr(kpis.total_outstanding_due)}
                  </KpiTile>
                )}

                {!isRentalAllowed && isSalesAllowed && (
                  <KpiTile
                    to={path('/sales')}
                    label="All-time sales revenue"
                    hint={`${counts.total_sales ?? summary?.sales?.total ?? 0} total sales recorded`}
                    icon="fa-coins"
                    iconClass="bg-amber-500/10 text-amber-600"
                    valueClass="text-[1.85rem] text-amber-600 dark:text-amber-400"
                  >
                    {formatInr(summary?.sales?.revenue ?? 0)}
                  </KpiTile>
                )}
              </div>
            </div>
          </div>
        </DashboardSection>
      ) : (
        <DashboardSection
          icon="fa-list-check"
          iconWrapClass="bg-amber-500/10 text-amber-600"
          title="Today’s snapshot"
          subtitle="Loading live rental, inventory, and revenue status…"
        >
          <DashboardKpiSkeleton count={4} />
        </DashboardSection>
      )}

      {/* SHOP QUOTAS & USAGE LIMITS */}
      {hasAnyLimit && (
        <DashboardSection
          icon="fa-gauge-high"
          iconWrapClass="bg-indigo-500/10 text-indigo-500"
          title="Plan quotas & usage"
          subtitle={`Active usage against tier limits for ${companyName || 'this shop'}`}
        >
          <div
            className={cn(
              'grid grid-cols-1 gap-3',
              isRentalAllowed && isSalesAllowed ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
            )}
          >
            <QuotaBar
              label="Product Catalog"
              current={counts.total_products ?? summary?.products?.total ?? 0}
              max={maxProducts}
              icon="fa-shirt"
              colorClass="bg-amber-500/10 text-amber-600"
              barClass="bg-amber-500"
            />
            {isRentalAllowed && (
              <QuotaBar
                label="Rental Bookings"
                current={counts.total_bookings ?? summary?.bookings?.total ?? 0}
                max={maxBookings}
                icon="fa-calendar-check"
                colorClass="bg-indigo-500/10 text-indigo-500"
                barClass="bg-indigo-500"
              />
            )}
            {isSalesAllowed && (
              <QuotaBar
                label="Sales Transactions"
                current={counts.total_sales ?? summary?.sales?.total ?? 0}
                max={maxSales}
                icon="fa-cash-register"
                colorClass="bg-emerald-500/10 text-emerald-600"
                barClass="bg-emerald-500"
              />
            )}
          </div>
        </DashboardSection>
      )}

      {/* QUICK ACTIONS */}
      <DashboardSection
        icon="fa-bolt"
        iconWrapClass="bg-indigo-500/10 text-indigo-500"
        title="Quick actions"
        subtitle="Jump into the most common shop tasks"
      >
        <div
          className={cn(
            'grid grid-cols-1 gap-3',
            quickActions.length === 3 ? 'min-[720px]:grid-cols-3' : 'min-[720px]:grid-cols-2',
          )}
          aria-label="Quick actions"
        >
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={path(action.to)}
              className={cn(
                'group flex items-center gap-4 rounded-xl border border-border bg-surface-muted/50 px-4 py-4 text-inherit no-underline shadow-xs transition-all duration-160',
                'hover:border-accent/40 hover:shadow-md hover:bg-surface',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <span
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-xl text-lg',
                  TONE_ICON_CLASSES[action.tone],
                )}
                aria-hidden="true"
              >
                <i className={`fa-solid ${action.icon}`} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-base font-bold text-text group-hover:text-accent transition-colors">
                  {action.title}
                </span>
                <span className="text-[0.8rem] leading-[1.4] text-text-secondary">
                  {action.description}
                </span>
              </span>
              <span
                className="shrink-0 text-text-muted transition-[color,transform] duration-160 group-hover:translate-x-[3px] group-hover:text-accent"
                aria-hidden="true"
              >
                <i className="fa-solid fa-arrow-right" />
              </span>
            </Link>
          ))}
        </div>
      </DashboardSection>

      {/* REAL-TIME RETURNS SCHEDULE (Rental shops only) */}
      {isRentalAllowed && <ReturnsSchedule onRefreshData={loadDashboardData} />}

      {/* ACTIVITY & REVENUE TRENDS */}
      <DashboardSection
        icon="fa-chart-column"
        iconWrapClass="bg-emerald-500/10 text-emerald-600"
        title="Activity & revenue trends"
        subtitle={
          isRentalAllowed && isSalesAllowed
            ? 'Daily booking volume and sales breakdown'
            : isRentalAllowed
            ? 'Daily booking volume trends'
            : 'Daily sales volume breakdown'
        }
        headerRight={(
          <div className="view-toggle">
            <button
              type="button"
              className={chartDays === 7 ? 'active' : ''}
              onClick={() => setChartDays(7)}
            >
              7 Days
            </button>
            <button
              type="button"
              className={chartDays === 30 ? 'active' : ''}
              onClick={() => setChartDays(30)}
            >
              30 Days
            </button>
            <button
              type="button"
              className={chartDays === 90 ? 'active' : ''}
              onClick={() => setChartDays(90)}
            >
              3 Months
            </button>
          </div>
        )}
      >
        <div
          className={cn(
            'grid min-w-0 grid-cols-1 gap-4',
            isRentalAllowed && isSalesAllowed ? 'min-[960px]:grid-cols-2' : 'grid-cols-1',
          )}
          aria-label="Activity trends"
        >
          {chartLoading && (
            <>
              {isRentalAllowed && (
                <div className="h-72 rounded-xl bg-surface-muted/50 border border-border flex items-center justify-center text-text-secondary animate-pulse">
                  Loading rentals chart...
                </div>
              )}
              {isSalesAllowed && (
                <div className="h-72 rounded-xl bg-surface-muted/50 border border-border flex items-center justify-center text-text-secondary animate-pulse">
                  Loading sales chart...
                </div>
              )}
            </>
          )}
          {!chartLoading && chartError && (
            <div className="col-span-full p-8 text-center text-rose-500 bg-rose-50 rounded-xl border border-rose-200">
              {chartError}
            </div>
          )}
          {!chartLoading && !chartError && (
            <>
              {isRentalAllowed && <BookingsChart chart={bookingsChart} />}
              {isSalesAllowed && <SalesChart chart={salesChart} />}
            </>
          )}
        </div>
      </DashboardSection>
    </div>
  )
}

export default DashboardPage

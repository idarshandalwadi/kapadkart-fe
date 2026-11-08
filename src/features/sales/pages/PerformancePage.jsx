import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchProductPerformanceReport } from '../api/performance'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/utils/cn'
import { useTenant } from '@/shared/tenant/TenantContext'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import ProductPerformanceModal from '../components/ProductPerformanceModal'
import { fetchProductById } from '@/features/products/api/products'
import DateInput from '@/shared/components/DateInput'
import ListingFilterBar from '@/shared/components/ListingFilterBar'
import ReportsTabs from '@/shared/components/ReportsTabs'
import Pagination from '@/shared/components/Pagination'
import ListingPrintReport from '@/shared/components/ListingPrintReport'
import { printListingReport } from '@/shared/utils/printBill'
import { generatePerformanceCsv, downloadCsvFile } from '@/shared/utils/exportCsv'

const softBtnClass =
  'rounded-[9px] border border-border bg-white font-semibold text-text cursor-pointer transition-[background-color,border-color,color] duration-160 enabled:hover:bg-accent-soft enabled:hover:border-[#f0d19a] enabled:hover:text-accent-text disabled:opacity-45 disabled:cursor-not-allowed'

function formatCurrency(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '₹0'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function exportPerformanceToCsv(rows, { from, to } = {}) {
  const csv = generatePerformanceCsv(rows)
  const range =
    from && to
      ? `${from}_to_${to}`
      : from
        ? `from_${from}`
        : to
          ? `to_${to}`
          : new Date().toISOString().slice(0, 10)
  downloadCsvFile(csv, `product-performance-roi-${range}.csv`)
}

export default function PerformancePage() {
  const { businessType, isRentalAllowed, isSalesAllowed, branding } = useTenant()
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortBy, setSortBy] = useState('net_profit')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [printingPdf, setPrintingPdf] = useState(false)
  const [printListRows, setPrintListRows] = useState(null)
  const [selectedPerformanceProduct, setSelectedPerformanceProduct] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)

  const debouncedSearch = useDebouncedValue(search)

  const todayStr = React.useMemo(() => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])

  const loadData = async (page = 1) => {
    const cleanFrom = typeof from === 'string' ? from.trim() : ''
    const cleanTo = typeof to === 'string' ? to.trim() : ''

    if (cleanFrom && cleanTo && cleanFrom > cleanTo) {
      toast.error('From date cannot be after To date')
      return
    }

    setLoading(true)
    try {
      const res = await fetchProductPerformanceReport({
        page,
        limit: 20,
        search: debouncedSearch.trim(),
        from: cleanFrom || undefined,
        to: cleanTo || undefined,
        sort_by: sortBy,
        order: sortOrder,
      })
      setData(res.data || [])
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 })
    } catch (err) {
      toast.error(err.message || 'Failed to load performance report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
  }, [debouncedSearch, from, to, sortBy, sortOrder])

  // PDF Print watcher
  useEffect(() => {
    if (!printListRows) return undefined

    const printTimer = window.setTimeout(() => {
      printListingReport({ title: 'Product Performance & ROI Report', from, to })
    }, 50)
    const clearPrint = () => setPrintListRows(null)
    window.addEventListener('afterprint', clearPrint)

    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', clearPrint)
    }
  }, [printListRows, from, to])

  const handleFromChange = (e) => {
    const val = typeof e === 'string' ? e : e?.target ? e.target.value : ''
    const clean = typeof val === 'string' ? val.trim() : ''
    if (clean && clean > todayStr) {
      toast.error('From date cannot be in the future')
      return
    }
    if (clean && to && clean > to) {
      setTo(clean)
    }
    setFrom(clean)
  }

  const handleToChange = (e) => {
    const val = typeof e === 'string' ? e : e?.target ? e.target.value : ''
    const clean = typeof val === 'string' ? val.trim() : ''
    if (clean && clean > todayStr) {
      toast.error('To date cannot be in the future')
      return
    }
    if (clean && from && clean < from) {
      toast.error('To date cannot be before From date')
      return
    }
    setTo(clean)
  }

  const handleExport = () => {
    if (!data.length) {
      toast.error('No data to export')
      return
    }
    setExporting(true)
    try {
      exportPerformanceToCsv(data, { from, to })
      toast.success(`Exported ${data.length} product performance records`)
    } catch {
      toast.error('Failed to export performance report')
    } finally {
      setExporting(false)
    }
  }

  const handlePrintPdf = async () => {
    if (!data.length) {
      toast.error('No performance records to print')
      return
    }
    setPrintingPdf(true)
    try {
      const res = await fetchProductPerformanceReport({
        page: 1,
        limit: Math.max(pagination.total || 100, 100),
        search: debouncedSearch.trim() || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        sort_by: sortBy,
        order: sortOrder,
      })
      const rows = res.data || []
      if (!rows.length) {
        toast.error('No performance records found')
        return
      }
      setPrintListRows(rows)
    } catch (err) {
      toast.error(err.message || 'Failed to prepare PDF report')
    } finally {
      setPrintingPdf(false)
    }
  }

  const handleOpenPerformanceModal = (productRecord) => {
    setSelectedPerformanceProduct(productRecord)
  }

  const handleOpenFullProductDetails = async () => {
    if (!selectedPerformanceProduct?.id) return
    try {
      const product = await fetchProductById(selectedPerformanceProduct.id)
      setViewingProduct(product)
    } catch {
      toast.error('Failed to load product details.')
    }
  }

  const handleQuickPreset = (preset) => {
    const today = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const formatYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const todayFormatted = formatYMD(today)

    if (preset === 'today') {
      setFrom(todayFormatted)
      setTo(todayFormatted)
    } else if (preset === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      setFrom(formatYMD(weekAgo))
      setTo(todayFormatted)
    } else if (preset === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      setFrom(formatYMD(monthStart))
      setTo(todayFormatted)
    } else if (preset === 'all') {
      setFrom('')
      setTo('')
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
  }

  const hasActiveFilters = Boolean(search || from || to)
  const isDateFiltered = Boolean(from || to)

  // Aggregate totals across loaded records
  const totalInvested = data.reduce(
    (sum, p) =>
      sum +
      (Number(p.invested_amount) ||
        Number(p.purchase_price || 0) * (Number(p.total_quantity || 0) + Number(p.units_sold || 0))),
    0,
  )
  const totalRentalRevenue = data.reduce((sum, p) => sum + (Number(p.rental_revenue) || 0), 0)
  const totalSalesRevenue = data.reduce((sum, p) => sum + (Number(p.sales_revenue) || 0), 0)
  const totalCombinedRevenue = data.reduce((sum, p) => sum + (Number(p.total_revenue) || 0), 0)
  const totalSoldCost = data.reduce(
    (sum, p) => sum + Number(p.purchase_price || 0) * Number(p.units_sold || 0),
    0,
  )
  const totalCurrentStockInvested = data.reduce(
    (sum, p) => sum + Number(p.purchase_price || 0) * Number(p.total_quantity || 0),
    0,
  )
  const totalNetProfit = data.reduce((sum, p) => sum + (Number(p.net_profit) || 0), 0)

  // Active table columns count for colSpan
  const colSpanCount = 6 + (isRentalAllowed ? 2 : 0) + (isSalesAllowed ? 2 : 0)

  // Printable table columns & rows matching tenant businessType
  const printColumns = [
    { key: 'product_name', label: 'Product Name' },
    { key: 'product_code', label: 'Code' },
    { key: 'stock_info', label: 'Stock / Sold', align: 'center' },
    { key: 'purchase_price_fmt', label: 'Unit Cost', align: 'right' },
    { key: 'invested_amount_fmt', label: 'Invested', align: 'right' },
    ...(isRentalAllowed
      ? [
          { key: 'times_rented', label: 'Rented', align: 'center' },
          { key: 'rental_revenue_fmt', label: 'Rental Rev', align: 'right' },
        ]
      : []),
    ...(isSalesAllowed
      ? [
          { key: 'units_sold', label: 'Sold', align: 'center' },
          { key: 'sales_revenue_fmt', label: 'Sales Rev', align: 'right' },
        ]
      : []),
    { key: 'total_revenue_fmt', label: 'Total Rev', align: 'right' },
    { key: 'net_profit_fmt', label: 'Net Profit', align: 'right' },
  ]

  const printRowsFormatted = (printListRows || []).map((p) => {
    const totalPurchased =
      p.total_purchased_quantity ?? (Number(p.total_quantity || 0) + Number(p.units_sold || 0))
    const investedVal = p.invested_amount ?? Number(p.purchase_price || 0) * totalPurchased
    return {
      id: p.id,
      product_name: p.product_name,
      product_code: p.product_code || '—',
      stock_info: `${p.total_quantity || 0} in stock${p.units_sold > 0 ? ` (${p.units_sold} sold)` : ''}`,
      purchase_price_fmt: formatCurrency(p.purchase_price),
      invested_amount_fmt: formatCurrency(investedVal),
      times_rented: p.times_rented || 0,
      rental_revenue_fmt: formatCurrency(p.rental_revenue),
      units_sold: p.units_sold || 0,
      sales_revenue_fmt: formatCurrency(p.sales_revenue),
      total_revenue_fmt: formatCurrency(p.total_revenue),
      net_profit_fmt: formatCurrency(p.net_profit),
    }
  })

  const printTotals = [
    'Totals',
    `${printRowsFormatted.length} Items`,
    '',
    '',
    formatCurrency(totalInvested),
    ...(isRentalAllowed ? ['', formatCurrency(totalRentalRevenue)] : []),
    ...(isSalesAllowed ? ['', formatCurrency(totalSalesRevenue)] : []),
    formatCurrency(totalCombinedRevenue),
    formatCurrency(totalNetProfit),
  ]

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] animate-fade-up pb-12">
      <div className="page-header">
        <div className="page-header-copy">
          <div className="flex items-center gap-2">
            <p className="page-kicker">Analytics</p>
            {isDateFiltered ? (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.68rem] sm:text-[0.72rem] font-bold text-accent-text border border-[#f0d19a]">
                {from || 'Start'} → {to || 'Today'}
              </span>
            ) : (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[0.68rem] sm:text-[0.72rem] font-semibold text-text-muted border border-border">
                All-Time
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Performance & ROI</h1>
            {pagination && (
              <span className="page-count">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="page-lead">
            Analyze item-level revenue, rental utilization, sales velocity, invested capital, and net return on investment.
          </p>
        </div>
        <div className="page-header-actions flex items-center gap-2">
          {/* Print PDF Button */}
          <button
            type="button"
            className={cn(
              softBtnClass,
              'h-9 sm:h-[2.65rem] box-border px-3 sm:px-[0.95rem] text-xs sm:text-[0.85rem] flex items-center gap-1.5',
            )}
            onClick={handlePrintPdf}
            disabled={printingPdf || loading || data.length === 0}
            title="Print or Save PDF report with active filters"
          >
            <i className={cn('fa-solid', printingPdf ? 'fa-spinner fa-spin' : 'fa-print')} aria-hidden="true" />
            <span>{printingPdf ? 'Preparing…' : 'Print PDF'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            className={cn(
              'btn-primary',
              'h-9 sm:h-[2.65rem] box-border justify-center px-3 sm:px-[0.95rem] text-xs sm:text-[0.85rem]',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
            )}
            onClick={handleExport}
            disabled={exporting || loading || data.length === 0}
            title="Export performance report to CSV"
          >
            <i className={cn('fa-solid', exporting ? 'fa-spinner fa-spin' : 'fa-file-export')} aria-hidden="true" />
            <span>{exporting ? 'Exporting…' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      <ReportsTabs />

      {/* Summary KPI Cards - Responsive Grid adapted to tenant businessType */}
      <div
        className={cn(
          'grid gap-2 sm:gap-4',
          isRentalAllowed && isSalesAllowed
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[0.68rem] sm:text-xs font-bold uppercase tracking-wider text-text-muted">Total Invested</p>
          <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-bold font-display text-primary">{formatCurrency(totalInvested)}</p>
          <p className="mt-0.5 text-[0.68rem] sm:text-xs text-text-secondary truncate">
            Stock: {formatCurrency(totalCurrentStockInvested)}
          </p>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[0.68rem] sm:text-xs font-bold uppercase tracking-wider text-text-muted">
            {isRentalAllowed && isSalesAllowed
              ? 'Combined Revenue'
              : isRentalAllowed
                ? 'Rental Revenue'
                : 'Sales Revenue'}
          </p>
          <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-bold font-display text-text">{formatCurrency(totalCombinedRevenue)}</p>
          <p className="mt-0.5 text-[0.68rem] sm:text-xs text-text-secondary truncate">
            {isDateFiltered ? 'Period earnings' : `${data.length} listed items`}
          </p>
        </div>

        {/* Rental Earnings Card - Only shown if rental allowed */}
        {isRentalAllowed && (
          <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-2.5 sm:p-4 shadow-2xs">
            <p className="text-[0.68rem] sm:text-xs font-bold uppercase tracking-wider text-text-muted">Rental Earnings</p>
            <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-bold font-display text-accent-text">{formatCurrency(totalRentalRevenue)}</p>
            <p className="mt-0.5 text-[0.68rem] sm:text-xs text-text-secondary truncate">
              Recurring rentals
            </p>
          </div>
        )}

        {/* Sales Earnings Card - Only shown if sales allowed */}
        {isSalesAllowed && (
          <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-2.5 sm:p-4 shadow-2xs">
            <p className="text-[0.68rem] sm:text-xs font-bold uppercase tracking-wider text-text-muted">Sales Earnings</p>
            <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-bold font-display text-info-text">{formatCurrency(totalSalesRevenue)}</p>
            <p className="mt-0.5 text-[0.68rem] sm:text-xs text-text-secondary truncate">
              {totalSoldCost > 0 ? `Cost: ${formatCurrency(totalSoldCost)}` : 'Direct sales'}
            </p>
          </div>
        )}

        <div
          className={cn(
            'rounded-xl sm:rounded-2xl border border-border bg-surface p-2.5 sm:p-4 shadow-2xs',
            isRentalAllowed && isSalesAllowed ? 'col-span-2 sm:col-span-1' : '',
          )}
        >
          <p className="text-[0.68rem] sm:text-xs font-bold uppercase tracking-wider text-text-muted">Estimated Net ROI</p>
          <p className={cn('mt-0.5 sm:mt-1 text-sm sm:text-2xl font-bold font-display', totalNetProfit >= 0 ? 'text-success-text' : 'text-danger-text')}>
            {totalNetProfit >= 0 ? `+${formatCurrency(totalNetProfit)}` : `-${formatCurrency(Math.abs(totalNetProfit))}`}
          </p>
          <p className="mt-0.5 text-[0.68rem] sm:text-xs text-text-secondary truncate">
            {totalInvested > 0 ? `${((totalNetProfit / totalInvested) * 100).toFixed(1)}% on invested` : 'Net return'}
          </p>
        </div>
      </div>

      {/* Search & Date Filter Panel */}
      <ListingFilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search by product name or item code..."
        activeFilterCount={(from ? 1 : 0) + (to ? 1 : 0)}
        activeChips={[
          ...(from
            ? [
                {
                  key: 'from',
                  label: `From: ${from}`,
                  onRemove: () => setFrom(''),
                },
              ]
            : []),
          ...(to
            ? [
                {
                  key: 'to',
                  label: `To: ${to}`,
                  onRemove: () => setTo(''),
                },
              ]
            : []),
        ]}
        onClearAll={hasActiveFilters ? handleClearFilters : null}
      >
        <div className="filter-field">
          <label htmlFor="perf-from">From Date</label>
          <DateInput
            id="perf-from"
            value={from}
            onChange={handleFromChange}
            max={to || todayStr}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="perf-to">To Date</label>
          <DateInput
            id="perf-to"
            value={to}
            onChange={handleToChange}
            min={from || undefined}
            max={todayStr}
          />
        </div>

        <div className="filter-field col-span-full flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-text-muted mr-1">Presets:</span>
            <button
              type="button"
              className={cn(softBtnClass, 'px-2.5 py-1 text-xs', !from && !to ? 'bg-primary-soft border-primary-border text-primary font-bold' : '')}
              onClick={() => handleQuickPreset('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={cn(softBtnClass, 'px-2.5 py-1 text-xs')}
              onClick={() => handleQuickPreset('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={cn(softBtnClass, 'px-2.5 py-1 text-xs')}
              onClick={() => handleQuickPreset('week')}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={cn(softBtnClass, 'px-2.5 py-1 text-xs')}
              onClick={() => handleQuickPreset('month')}
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort By: Net Profit / Created Date */}
            <div className="flex items-center rounded-[9px] border border-border overflow-hidden text-xs font-semibold">
              <button
                type="button"
                className={cn(
                  'px-3 py-1.5 cursor-pointer transition-colors duration-160',
                  sortBy === 'net_profit'
                    ? 'bg-accent text-white border-0'
                    : 'bg-white text-text hover:bg-surface-muted',
                )}
                onClick={() => setSortBy('net_profit')}
                title="Sort by Net Profit (highest first by default)"
              >
                <i className="fa-solid fa-chart-line mr-1" aria-hidden="true" />
                Net Profit
              </button>
              <button
                type="button"
                className={cn(
                  'px-3 py-1.5 cursor-pointer transition-colors duration-160 border-l border-border',
                  sortBy === 'created_at'
                    ? 'bg-accent text-white border-l-accent'
                    : 'bg-white text-text hover:bg-surface-muted',
                )}
                onClick={() => setSortBy('created_at')}
                title="Sort by Created Date"
              >
                <i className="fa-regular fa-calendar mr-1" aria-hidden="true" />
                Created Date
              </button>
            </div>

            {/* Direction toggle */}
            <button
              type="button"
              className={cn(softBtnClass, 'px-2.5 py-1.5 text-xs flex items-center gap-1.5')}
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? 'Switch to ascending order' : 'Switch to descending order'}
            >
              <i
                className={cn(
                  'fa-solid',
                  sortOrder === 'desc' ? 'fa-arrow-down-wide-short text-accent-text' : 'fa-arrow-up-wide-short text-primary',
                )}
                aria-hidden="true"
              />
              {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
            </button>
          </div>
        </div>
      </ListingFilterBar>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-4 py-3.5 text-center">
                  {isRentalAllowed && isSalesAllowed ? 'Stock / Sold' : isRentalAllowed ? 'Current Stock' : 'Stock / Sold'}
                </th>
                <th className="px-4 py-3.5 text-right">Purchase Price</th>
                <th className="px-4 py-3.5 text-right font-bold text-primary">Invested Amount</th>
                {isRentalAllowed && (
                  <>
                    <th className="px-4 py-3.5 text-center">Times Rented</th>
                    <th className="px-4 py-3.5 text-right">Rental Rev.</th>
                  </>
                )}
                {isSalesAllowed && (
                  <>
                    <th className="px-4 py-3.5 text-center">Units Sold</th>
                    <th className="px-4 py-3.5 text-right">Sales Rev.</th>
                  </>
                )}
                <th className="px-5 py-3.5 text-right font-bold text-text">Total Rev.</th>
                <th className="px-5 py-3.5 text-right font-bold text-success-text">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={colSpanCount} className="py-12 text-center text-text-secondary">
                    <div className="loading-state">Loading performance metrics…</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={colSpanCount} className="py-12 text-center text-text-secondary">
                    <div className="empty-state">No products found for this search.</div>
                  </td>
                </tr>
              ) : (
                data.map((p) => {
                  const totalPurchased =
                    p.total_purchased_quantity ?? (Number(p.total_quantity || 0) + Number(p.units_sold || 0))
                  const investedVal = p.invested_amount ?? Number(p.purchase_price || 0) * totalPurchased
                  const soldCost = Number(p.units_sold || 0) * Number(p.purchase_price || 0)
                  const currentStockVal = Number(p.total_quantity || 0) * Number(p.purchase_price || 0)

                  return (
                    <tr key={p.id} className="transition-colors hover:bg-surface-muted/50">
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          className="group block cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                          onClick={() => handleOpenPerformanceModal(p)}
                          title="Click to view full financial & operational performance breakdown"
                        >
                          <span className="block font-semibold text-text group-hover:text-accent-text transition-colors">
                            {p.product_name}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-text-muted mt-0.5">
                            <span>{p.product_code || '—'}</span>
                            {p.created_at && (
                              <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.2 text-[0.68rem] font-sans text-text-secondary border border-border/60">
                                <i className="fa-regular fa-calendar text-[0.62rem] text-text-muted" aria-hidden="true" />
                                {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-text">{p.total_quantity} in stock</span>
                          <span className="text-[0.7rem] text-text-muted">
                            {p.units_sold > 0 ? `${p.units_sold} sold • ${totalPurchased} total` : `${totalPurchased} total`}
                          </span>
                          {p.damaged_quantity > 0 && (
                            <span className="mt-0.5 rounded-md bg-danger-bg px-1.5 py-0.2 text-[0.7rem] font-bold text-danger-text">
                              {p.damaged_quantity} dmg
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-secondary">
                        {formatCurrency(p.purchase_price)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-primary">
                        {formatCurrency(investedVal)}
                        <span className="block text-[0.68rem] font-normal text-text-muted">
                          Stock: {formatCurrency(currentStockVal)}
                          {soldCost > 0 && ` · Sold: ${formatCurrency(soldCost)}`}
                        </span>
                      </td>

                      {/* Rental metrics */}
                      {isRentalAllowed && (
                        <>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-text">
                              {p.times_rented}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-accent-text font-semibold">
                            {formatCurrency(p.rental_revenue)}
                          </td>
                        </>
                      )}

                      {/* Sales metrics */}
                      {isSalesAllowed && (
                        <>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex rounded-lg bg-info-bg px-2.5 py-1 text-xs font-bold text-info-text">
                              {p.units_sold}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-info-text font-semibold">
                            {formatCurrency(p.sales_revenue)}
                            {soldCost > 0 && (
                              <span className="block text-[0.68rem] text-text-muted font-normal">
                                Cost: {formatCurrency(soldCost)}
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      <td className="px-5 py-3.5 text-right font-mono font-bold text-text text-base">
                        {formatCurrency(p.total_revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-base">
                        <span
                          className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-bold',
                            p.net_profit >= 0
                              ? 'bg-success-bg text-success-text'
                              : 'bg-danger-bg text-danger-text',
                          )}
                        >
                          {p.net_profit >= 0 ? `+${formatCurrency(p.net_profit)}` : `-${formatCurrency(Math.abs(p.net_profit))}`}
                        </span>
                        {soldCost > 0 && (
                          <span className="block text-[0.68rem] text-text-muted font-normal mt-0.5">
                            {formatCurrency(p.total_revenue)} − {formatCurrency(soldCost)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={loadData}
          loading={loading}
          showTotal
          className="border-t border-border px-4 py-3"
        />
      </div>

      {/* Product Performance Breakdown Modal */}
      <ProductPerformanceModal
        product={selectedPerformanceProduct}
        open={Boolean(selectedPerformanceProduct)}
        onClose={() => setSelectedPerformanceProduct(null)}
        onViewProductDetails={handleOpenFullProductDetails}
        businessType={businessType}
      />

      {/* Full Product Details & Gallery Modal */}
      <ProductInfoDialog
        product={viewingProduct}
        open={Boolean(viewingProduct)}
        onClose={() => setViewingProduct(null)}
      />

      {/* Hidden Printable Landscape Report for Window.print() / PDF */}
      {printListRows && (
        <ListingPrintReport
          title="Product Performance & ROI Report"
          settings={branding}
          from={from}
          to={to}
          extraFilters={debouncedSearch.trim() ? `Search: ${debouncedSearch.trim()}` : null}
          columns={printColumns}
          rows={printRowsFormatted}
          totals={printTotals}
        />
      )}
    </div>
  )
}

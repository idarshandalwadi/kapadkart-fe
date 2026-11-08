import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchSalesReports } from '@/features/sales/api/salesReports'
import FormSelect from '@/shared/components/FormSelect'
import RevenueChart from '@/features/sales/components/RevenueChart'
import SalesHistoryTable from '@/features/sales/components/SalesHistoryTable'
import { fetchBookingById } from '@/features/bookings/api/bookings'
import BookingBillPrint from '@/features/bookings/components/BookingBillPrint'
import {
  calcLineTotal,
  formatSelectedProductsNames,
  parseSelectedProducts,
  totalSelectedProductsQuantity,
} from '@/features/bookings/utils/bookingLineItems'
import { DEFAULT_SALES_SORT, SALES_HISTORY_TABLE_COLUMNS } from '@/features/sales/constants/salesReports'
import { fetchSettings } from '@/features/settings/api/settings'
import ColumnPicker from '@/shared/components/ColumnPicker'
import ListingPrintReport from '@/shared/components/ListingPrintReport'
import { useColumnVisibility } from '@/shared/hooks/useColumnVisibility'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/utils/cn'
import { formatDateDisplay } from '@/shared/utils/dateFormat'
import { useTenant } from '@/shared/tenant/TenantContext'
import { printBill, printListingReport } from '@/shared/utils/printBill'
import DateInput from '@/shared/components/DateInput'
import ListingFilterBar from '@/shared/components/ListingFilterBar'
import ReportsTabs from '@/shared/components/ReportsTabs'
import Pagination from '@/shared/components/Pagination'


const HISTORY_LIMIT_OPTIONS = [10, 20, 50]
const CHART_DAYS_OPTIONS = [
  { value: 7, label: 'Chart: 7 days' },
  { value: 14, label: 'Chart: 14 days' },
  { value: 30, label: 'Chart: 30 days' },
  { value: 90, label: 'Chart: 3 months' },
  { value: 180, label: 'Chart: 6 months' },
  { value: 365, label: 'Chart: 1 year' },
]

function bookingToPrintForm(booking) {
  const rawProducts = booking.selected_products || booking.product_and_code
  const { legacyText, rentalDays } = parseSelectedProducts(rawProducts)
  const duration = Number(booking.rental_days ?? rentalDays ?? 1)

  const items = Array.isArray(booking.items) && booking.items.length > 0
    ? booking.items.map((it) => {
        const qty = Number(it.quantity) || 1
        const unitPrice = Number(it.unit_rent ?? it.unit_price) || 0
        const total = Number(it.total_amount) || calcLineTotal(qty, unitPrice, duration)
        return {
          product_id: it.product_id,
          product_name: it.product?.product_name || it.product_name || '',
          product_code: it.product?.product_code || it.product_code || '',
          image: it.product?.image || it.image || it.product_image || null,
          product: it.product || null,
          quantity: qty,
          unit_price: unitPrice,
          rental_days: duration,
          line_total: total,
          choyani: it.choyani || '',
          pant: it.pant || '',
          sol: it.sol || '',
          mojdi: it.mojdi || '',
          other_items: it.other_items || '',
        }
      })
    : (parseSelectedProducts(rawProducts).items || []).map((it) => {
        const qty = Number(it.quantity) || 1
        const unitPrice = Number(it.unit_price) || 0
        const total = Number(it.total_amount) || calcLineTotal(qty, unitPrice, duration)
        return {
          ...it,
          rental_days: duration,
          line_total: total,
        }
      })

  return {
    ...booking,
    rental_days: duration,
    line_items: items,
    legacy_products: legacyText,
  }
}

function formatCurrency(value) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function rentalHistoryToListRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    bill_no: row.bill_no || '—',
    name: row.customer_name || '—',
    village: row.village || '—',
    order_date: formatDateDisplay(row.order_date),
    return_date: formatDateDisplay(row.return_date),
    products: formatSelectedProductsNames(row.product_and_code),
    qty: totalSelectedProductsQuantity(row.product_and_code) ?? '—',
    paid: formatCurrency(row.paid_amount),
    due: formatCurrency(row.due_amount),
    total: formatCurrency(row.grand_total),
  }))
}

function rentalHistoryListTotals(rows, columns) {
  const money = {
    paid: formatCurrency(rows.reduce((sum, row) => sum + (Number(row.paid_amount) || 0), 0)),
    due: formatCurrency(rows.reduce((sum, row) => sum + (Number(row.due_amount) || 0), 0)),
    total: formatCurrency(rows.reduce((sum, row) => sum + (Number(row.grand_total) || 0), 0)),
  }
  const countLabel = `${rows.length} booking${rows.length === 1 ? '' : 's'}`
  let usedCount = false

  return columns.map((column, index) => {
    if (money[column.key]) return money[column.key]
    if (index === 0) return 'Total'
    if (!usedCount) {
      usedCount = true
      return countLabel
    }
    return ''
  })
}

import { generateRentalHistoryCsv, downloadCsvFile } from '@/shared/utils/exportCsv'

export function exportHistoryToCsv(rows, { from, to } = {}) {
  const csv = generateRentalHistoryCsv(rows)
  const range =
    from && to ? `${from}_to_${to}` : new Date().toISOString().slice(0, 10)
  downloadCsvFile(csv, `rental-report-${range}.csv`)
}

async function fetchAllRentalHistoryRows(params) {
  const all = []
  let page = 1
  const limit = 100

  while (true) {
    const json = await fetchSalesReports({
      ...params,
      page,
      limit,
    })
    const history = json.data?.bookingsHistory
    const rows = history?.data ?? (Array.isArray(json.data) ? json.data : [])
    all.push(...rows)
    const totalPages = history?.pagination?.totalPages || 1
    if (page >= totalPages || rows.length === 0) break
    page += 1
  }

  return all
}

function SalesReportsPage() {
  const { slug } = useTenant()
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    showAll: showAllColumns,
  } = useColumnVisibility(`kk:table-columns:${slug}:rental-history`, SALES_HISTORY_TABLE_COLUMNS)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(DEFAULT_SALES_SORT.sortBy)
  const [sortOrder, setSortOrder] = useState(DEFAULT_SALES_SORT.sortOrder)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [chartDays, setChartDays] = useState(7)

  const debouncedSearch = useDebouncedValue(search)

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [printBooking, setPrintBooking] = useState(null)
  const [printingId, setPrintingId] = useState(null)
  const [printListRows, setPrintListRows] = useState(null)
  const [printingList, setPrintingList] = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const json = await fetchSalesReports({
        from,
        to,
        search: debouncedSearch.trim(),
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
        chart_days: chartDays,
      })
      setReport(json.data)
    } catch (err) {
      setReport(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, debouncedSearch, sortBy, sortOrder, page, limit, chartDays])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const json = await fetchSettings()
        setSettings(json.data ?? json)
      } catch {
        // Share message still works with default company name.
      }
    }
    loadSettings()
  }, [])

  const handlePrintBill = async (row) => {
    setPrintingId(row.id)
    try {
      const booking = await fetchBookingById(row.id)
      setPrintBooking(booking)
    } catch (err) {
      toast.error(err.message || 'Failed to load bill for printing')
      setPrintingId(null)
    }
  }

  useEffect(() => {
    if (!printBooking) return undefined

    let cleared = false
    const clearPrint = () => {
      if (cleared) return
      cleared = true
      setPrintingId(null)
      setPrintBooking(null)
    }

    window.addEventListener('afterprint', clearPrint)
    const printTimer = window.setTimeout(() => {
      printBill({
        customerName: printBooking.customer_name,
        billNo: printBooking.bill_no,
        date: printBooking.created_at || printBooking.pickup_date || new Date(),
      })
    }, 50)
    const spinnerFallback = window.setTimeout(() => {
      setPrintingId(null)
    }, 3000)

    return () => {
      window.clearTimeout(printTimer)
      window.clearTimeout(spinnerFallback)
      window.removeEventListener('afterprint', clearPrint)
    }
  }, [printBooking])

  useEffect(() => {
    if (!printListRows) return undefined

    const printTimer = window.setTimeout(() => {
      printListingReport({ title: 'Rental Report', from, to })
    }, 50)
    const clearPrint = () => setPrintListRows(null)
    window.addEventListener('afterprint', clearPrint)

    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', clearPrint)
    }
  }, [printListRows, from, to])

  const resetPage = () => setPage(1)

  const handleFromChange = (e) => {
    setFrom(e.target.value)
    resetPage()
  }

  const handleToChange = (e) => {
    setTo(e.target.value)
    resetPage()
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    resetPage()
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    resetPage()
  }

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value))
    resetPage()
  }

  const handleChartDaysChange = (e) => {
    setChartDays(Number(e.target.value))
  }

  const clearFilters = () => {
    setFrom('')
    setTo('')
    setSearch('')
    setSortBy(DEFAULT_SALES_SORT.sortBy)
    setSortOrder(DEFAULT_SALES_SORT.sortOrder)
    setPage(1)
  }

  const canExport = Boolean(from && to)

  const handleExport = async () => {
    if (!canExport) {
      toast.error('Select From and To dates to export')
      return
    }

    setExporting(true)
    try {
      const allRows = await fetchAllRentalHistoryRows({
        from,
        to,
        search: debouncedSearch.trim(),
        sort_by: sortBy,
        sort_order: sortOrder,
        chart_days: chartDays,
      })

      if (!allRows.length) {
        toast.error('No rental records found for the selected date range')
        return
      }

      exportHistoryToCsv(allRows, { from, to })
      toast.success(`Exported ${allRows.length} rental record${allRows.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to export rental report')
    } finally {
      setExporting(false)
    }
  }

  const handlePrintList = async () => {
    if (!canExport) {
      toast.error('Select From and To dates to print')
      return
    }

    setPrintingList(true)
    try {
      const allRows = await fetchAllRentalHistoryRows({
        from,
        to,
        search: debouncedSearch.trim(),
        sort_by: sortBy,
        sort_order: sortOrder,
        chart_days: chartDays,
      })

      if (!allRows.length) {
        toast.error('No rental records found for the selected date range')
        return
      }

      setPrintListRows(allRows)
    } catch (err) {
      toast.error(err.message || 'Failed to load rental report for printing')
    } finally {
      setPrintingList(false)
    }
  }

  const hasFilters = from || to || search

  const stats = report?.quickStats || {
    totalRevenueCompleted: 0,
    totalPaidAmount: 0,
    totalDueAmount: 0,
    totalProductsHandled: 0,
    completedBookings: 0,
    reservedActiveBookings: 0,
  }
  const history = report?.bookingsHistory || (Array.isArray(report) ? { data: report } : null)
  const rows = history?.data ?? []
  const pagination = history?.pagination

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] animate-fade-up">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Analytics</p>
          <h1 className="page-title">Rental Report</h1>
          <p className="page-lead">Review rental revenue trends and booking history.</p>
        </div>
        <div className="page-header-actions">
          <FormSelect
            className="min-w-[9rem] sm:min-w-[11.5rem]"
            value={chartDays}
            clearable={false}
            onChange={handleChartDaysChange}
            options={CHART_DAYS_OPTIONS}
          />
        </div>
      </div>

      <ReportsTabs />

      {loading && !report && <div className="loading-state">Loading rental report...</div>}

      {error && !loading && <p className="error-text">{error}</p>}

      {report && (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-stretch">
            <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-[1.35rem] shadow-sm">
              <h2 className="m-0 mb-2.5 sm:mb-4 font-display text-base sm:text-[1.2rem] font-semibold tracking-[-0.02em] text-text">
                Quick Stats
              </h2>
              <ul className="m-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 list-none gap-2 sm:gap-[0.7rem] p-0">
                <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.65rem]">
                  <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                    Total Rental Value
                  </span>
                  <strong className="text-sm sm:text-[1.15rem] font-bold tracking-[-0.02em] text-text">
                    {formatCurrency(stats.totalRevenueCompleted)}
                  </strong>
                </li>
                <li className="flex flex-col gap-[0.2rem] rounded-xl border border-emerald-500/15 bg-emerald-50/40 px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.65rem]">
                  <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-emerald-800">
                    Total Paid (Received)
                  </span>
                  <strong className="text-sm sm:text-[1.15rem] font-bold tracking-[-0.02em] text-emerald-700">
                    {formatCurrency(stats.totalPaidAmount)}
                  </strong>
                </li>
                <li className="flex flex-col gap-[0.2rem] rounded-xl border border-amber-500/15 bg-amber-50/40 px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.65rem]">
                  <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-amber-800">
                    Total Due (Pending)
                  </span>
                  <strong className="text-sm sm:text-[1.15rem] font-bold tracking-[-0.02em] text-amber-700">
                    {formatCurrency(stats.totalDueAmount)}
                  </strong>
                </li>
                <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.65rem]">
                  <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                    Products Handled
                  </span>
                  <strong className="text-sm sm:text-[1.15rem] font-bold tracking-[-0.02em] text-text">
                    {stats.totalProductsHandled}
                  </strong>
                </li>
                <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.65rem]">
                  <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                    Completed Bookings
                  </span>
                  <strong className="text-sm sm:text-[1.15rem] font-bold tracking-[-0.02em] text-text">
                    {stats.completedBookings}
                  </strong>
                </li>
                <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.65rem]">
                  <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                    Reserved/Active
                  </span>
                  <strong className="text-sm sm:text-[1.15rem] font-bold tracking-[-0.02em] text-text">
                    {stats.reservedActiveBookings}
                  </strong>
                </li>
              </ul>
            </div>

            <RevenueChart chart={report.revenueChart} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="m-0 font-display text-[1.2rem] font-semibold tracking-[-0.02em] text-text">
              All Bookings History
            </h2>

            <ListingFilterBar
              search={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search name, bill no, phone, address, or product..."
              activeFilterCount={(from ? 1 : 0) + (to ? 1 : 0)}
              activeChips={[
                ...(from
                  ? [
                      {
                        key: 'from',
                        label: `From: ${from}`,
                        onRemove: () => {
                          setFrom('')
                          setPage(1)
                        },
                      },
                    ]
                  : []),
                ...(to
                  ? [
                      {
                        key: 'to',
                        label: `To: ${to}`,
                        onRemove: () => {
                          setTo('')
                          setPage(1)
                        },
                      },
                    ]
                  : []),
              ]}
              onClearAll={hasFilters ? clearFilters : null}
            >
              <div className="filter-field">
                <label htmlFor="sales-from">From</label>
                <DateInput
                  id="sales-from"
                  value={from}
                  onChange={handleFromChange}
                />
              </div>

              <div className="filter-field">
                <label htmlFor="sales-to">To</label>
                <DateInput
                  id="sales-to"
                  value={to}
                  onChange={handleToChange}
                />
              </div>

              <div className="filter-field">
                <label htmlFor="sales-limit">Entry Per page</label>
                <FormSelect
                  id="sales-limit"
                  value={limit}
                  clearable={false}
                  onChange={handleLimitChange}
                  options={HISTORY_LIMIT_OPTIONS.map((opt) => ({
                    value: opt,
                    label: String(opt),
                  }))}
                />
              </div>

              <div className="filter-field">
                <label htmlFor="sales-history-columns">Columns</label>
                <ColumnPicker
                  id="sales-history-columns"
                  columns={SALES_HISTORY_TABLE_COLUMNS}
                  visibleKeys={visibleKeys}
                  onToggle={toggleColumn}
                  onShowAll={showAllColumns}
                />
              </div>

              <div className="filter-field self-end sm:col-span-2 md:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    'btn-primary',
                    'h-9 sm:h-[2.65rem] flex-1 box-border justify-center px-3 sm:px-[0.95rem] text-xs sm:text-[0.85rem]',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:brightness-100',
                  )}
                  onClick={handlePrintList}
                  disabled={!canExport || printingList || loading}
                  title={
                    canExport
                      ? 'Print all records in the selected date range'
                      : 'Select From and To dates to print'
                  }
                >
                  <i
                    className={cn('fa-solid', printingList ? 'fa-spinner fa-spin' : 'fa-print')}
                    aria-hidden="true"
                  />
                  <span>{printingList ? 'Preparing…' : 'Print'}</span>
                </button>

                <button
                  type="button"
                  className={cn(
                    'btn-primary',
                    'h-9 sm:h-[2.65rem] flex-1 box-border justify-center px-3 sm:px-[0.95rem] text-xs sm:text-[0.85rem]',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:brightness-100',
                  )}
                  onClick={handleExport}
                  disabled={!canExport || exporting}
                  title={
                    canExport
                      ? 'Export all records in the selected date range'
                      : 'Select From and To dates to export'
                  }
                >
                  <i
                    className={cn('fa-solid', exporting ? 'fa-spinner fa-spin' : 'fa-file-export')}
                    aria-hidden="true"
                  />
                  <span>{exporting ? 'Exporting...' : 'Export'}</span>
                </button>
              </div>
            </ListingFilterBar>

            {loading && (
              <div className="text-center text-[0.9rem] text-text-secondary">Updating...</div>
            )}

            {!loading && rows.length === 0 && (
              <div className="empty-state">No bookings found for the selected filters.</div>
            )}

            {rows.length > 0 && (
              <SalesHistoryTable
                rows={rows}
                sortBy={history?.sort?.sortBy ?? sortBy}
                sortOrder={history?.sort?.sortOrder ?? sortOrder}
                onSort={handleSort}
                companyName={settings?.company_name}
                onPrintBill={handlePrintBill}
                printingId={printingId}
                visibleColumns={visibleKeys}
              />
            )}

            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              loading={loading}
              showTotal
            />
          </section>

          {printBooking && (
            <BookingBillPrint
              billNo={printBooking.bill_no}
              form={bookingToPrintForm(printBooking)}
              settings={settings}
            />
          )}

          {printListRows && (
            <ListingPrintReport
              title="Rental Report"
              settings={settings}
              from={from}
              to={to}
              extraFilters={debouncedSearch.trim() ? `Search: ${debouncedSearch.trim()}` : null}
              columns={visibleColumns}
              rows={rentalHistoryToListRows(printListRows)}
              totals={rentalHistoryListTotals(printListRows, visibleColumns)}
            />
          )}
        </>
      )}
    </div>
  )
}

export default SalesReportsPage

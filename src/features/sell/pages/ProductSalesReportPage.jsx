import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchSales, fetchSalesReportSummary } from '@/features/sell/api/sales'
import SaleBillPrint from '@/features/sell/components/SaleBillPrint'
import SaleTable from '@/features/sell/components/SaleTable'
import SaleInfoDialog from '@/features/sell/components/SaleInfoDialog'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import { fetchProductById } from '@/features/products/api/products'
import { SALE_TABLE_COLUMNS, saleStatusLabel } from '@/features/sell/constants/sales'
import {
  formatSelectedProductsNames,
  parseSelectedProducts,
  totalSelectedProductsQuantity,
} from '@/features/bookings/utils/bookingLineItems'
import RevenueChart from '@/features/sales/components/RevenueChart'
import { fetchSettings } from '@/features/settings/api/settings'
import ColumnPicker from '@/shared/components/ColumnPicker'
import FormSelect from '@/shared/components/FormSelect'
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


const softBtnClass =
  'rounded-[9px] border border-border bg-white font-semibold text-text cursor-pointer transition-[background-color,border-color,color] duration-160 enabled:hover:bg-accent-soft enabled:hover:border-[#f0d19a] enabled:hover:text-accent-text disabled:opacity-45 disabled:cursor-not-allowed'

const HISTORY_LIMIT_OPTIONS = [10, 20, 50]
const CHART_DAYS_OPTIONS = [
  { value: 7, label: 'Chart: 7 days' },
  { value: 14, label: 'Chart: 14 days' },
  { value: 30, label: 'Chart: 30 days' },
  { value: 90, label: 'Chart: 3 months' },
  { value: 180, label: 'Chart: 6 months' },
  { value: 365, label: 'Chart: 1 year' },
]
const DEFAULT_SALE_REPORT_SORT = { sortBy: 'bill_no', sortOrder: 'desc' }

function saleToPrintForm(sale) {
  const items = Array.isArray(sale.items) && sale.items.length > 0
    ? sale.items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product?.product_name || it.product_name || '',
        product_code: it.product?.product_code || it.product_code || '',
        image: it.product?.image || it.image || it.product_image || null,
        product: it.product || null,
        quantity: it.quantity,
        unit_price: Number(it.unit_price) || 0,
        line_total: Number(it.total_amount) || 0,
      }))
    : parseSelectedProducts(sale.selected_products || sale).items

  const legacyText = items.length ? '' : parseSelectedProducts(sale.selected_products || sale).legacyText

  return {
    ...sale,
    line_items: items,
    legacy_products: legacyText,
  }
}

function formatCurrency(value) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function salesToListRows(sales) {
  return sales.map((sale) => {
    const subtotal = Number(sale.subtotal) || (Number(sale.sale_total || 0) + Number(sale.discount_amount || 0))
    const discount = Number(sale.discount_amount || 0)

    return {
      id: sale.id,
      bill_no: sale.bill_no || '—',
      date: formatDateDisplay(sale.created_at),
      customer: sale.customer_name || '—',
      phone: sale.phone_number || '—',
      products: formatSelectedProductsNames(sale),
      qty: totalSelectedProductsQuantity(sale) ?? '—',
      subtotal: formatCurrency(subtotal),
      discount: discount > 0 ? `-${formatCurrency(discount)}` : '₹0.00',
      total: formatCurrency(sale.sale_total),
      paid: formatCurrency(sale.paid_amount),
      status: saleStatusLabel(sale.status),
    }
  })
}

function saleListTotals(sales, columns) {
  const money = {
    subtotal: formatCurrency(sales.reduce((sum, row) => sum + (Number(row.subtotal) || (Number(row.sale_total || 0) + Number(row.discount_amount || 0))), 0)),
    discount: formatCurrency(sales.reduce((sum, row) => sum + (Number(row.discount_amount) || 0), 0)),
    total: formatCurrency(sales.reduce((sum, row) => sum + (Number(row.sale_total) || 0), 0)),
    paid: formatCurrency(sales.reduce((sum, row) => sum + (Number(row.paid_amount) || 0), 0)),
  }
  const countLabel = `${sales.length} sale${sales.length === 1 ? '' : 's'}`
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

import { generateSalesReportCsv, downloadCsvFile } from '@/shared/utils/exportCsv'

export function exportSalesToCsv(rows, { from, to } = {}) {
  const csv = generateSalesReportCsv(rows)
  const range =
    from && to ? `${from}_to_${to}` : new Date().toISOString().slice(0, 10)
  downloadCsvFile(csv, `sales-report-${range}.csv`)
}

async function fetchAllSalesRows(params) {
  const all = []
  let page = 1
  const limit = 100

  while (true) {
    const json = await fetchSales({
      ...params,
      page,
      limit,
    })
    const rows = json.data ?? []
    all.push(...rows)
    const totalPages = json.pagination?.totalPages || 1
    if (page >= totalPages || rows.length === 0) break
    page += 1
  }

  return all
}

function ProductSalesReportPage() {
  const { slug } = useTenant()
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    showAll: showAllColumns,
  } = useColumnVisibility(`kk:table-columns:${slug}:sales`, SALE_TABLE_COLUMNS)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [chartDays, setChartDays] = useState(7)
  const [sortBy, setSortBy] = useState(DEFAULT_SALE_REPORT_SORT.sortBy)
  const [sortOrder, setSortOrder] = useState(DEFAULT_SALE_REPORT_SORT.sortOrder)

  const debouncedSearch = useDebouncedValue(search)

  const [sales, setSales] = useState([])
  const [pagination, setPagination] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [printSale, setPrintSale] = useState(null)
  const [printingId, setPrintingId] = useState(null)
  const [printListRows, setPrintListRows] = useState(null)
  const [printingList, setPrintingList] = useState(false)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [viewingSale, setViewingSale] = useState(null)

  const handleViewProduct = async (productId) => {
    try {
      const product = await fetchProductById(productId)
      setViewingProduct(product)
    } catch (err) {
      toast.error('Failed to load product details.')
    }
  }

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)

    try {
      const json = await fetchSalesReportSummary({ chart_days: chartDays })
      setSummary(json.data ?? null)
    } catch (err) {
      setSummary(null)
      setSummaryError(err.message)
    } finally {
      setSummaryLoading(false)
    }
  }, [chartDays])

  const loadSales = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const json = await fetchSales({
        page,
        limit,
        from,
        to,
        search: debouncedSearch.trim(),
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      setSales(json.data ?? [])
      setPagination(json.pagination ?? null)
    } catch (err) {
      setSales([])
      setPagination(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, limit, from, to, debouncedSearch, sortBy, sortOrder])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const json = await fetchSettings()
        setSettings(json.data ?? json)
      } catch {
        // Bill still prints with defaults if settings fail to load.
      }
    }
    loadSettings()
  }, [])

  const handlePrintBill = (sale) => {
    setPrintingId(sale.id)
    setPrintSale(sale)
  }

  useEffect(() => {
    if (!printSale) return undefined

    let cleared = false
    const clearPrint = () => {
      if (cleared) return
      cleared = true
      setPrintingId(null)
      setPrintSale(null)
    }

    window.addEventListener('afterprint', clearPrint)
    const printTimer = window.setTimeout(() => {
      printBill({
        customerName: printSale.customer_name,
        billNo: printSale.bill_no,
        date: printSale.created_at || new Date(),
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
  }, [printSale])

  useEffect(() => {
    if (!printListRows) return undefined

    const printTimer = window.setTimeout(() => {
      printListingReport({ title: 'Sales Report', from, to })
    }, 50)
    const clearPrint = () => setPrintListRows(null)
    window.addEventListener('afterprint', clearPrint)

    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', clearPrint)
    }
  }, [printListRows, from, to])

  const clearFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
    setSortBy(DEFAULT_SALE_REPORT_SORT.sortBy)
    setSortOrder(DEFAULT_SALE_REPORT_SORT.sortOrder)
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
      const allRows = await fetchAllSalesRows({
        from,
        to,
        search: debouncedSearch.trim(),
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (!allRows.length) {
        toast.error('No sales records found for the selected date range')
        return
      }

      exportSalesToCsv(allRows, { from, to })
      toast.success(`Exported ${allRows.length} sale${allRows.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to export sales report')
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
      const allRows = await fetchAllSalesRows({
        from,
        to,
        search: debouncedSearch.trim(),
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (!allRows.length) {
        toast.error('No sales records found for the selected date range')
        return
      }

      setPrintListRows(allRows)
    } catch (err) {
      toast.error(err.message || 'Failed to load sales report for printing')
    } finally {
      setPrintingList(false)
    }
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleFromChange = (e) => {
    setFrom(e.target.value)
    setPage(1)
  }

  const handleToChange = (e) => {
    setTo(e.target.value)
    setPage(1)
  }

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value))
    setPage(1)
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const hasFilters = Boolean(search || from || to)
  const stats = summary?.quickStats

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] animate-fade-up">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Analytics</p>
          <h1 className="page-title">Sales Report</h1>
          <p className="page-lead">Review product sale totals and transaction history.</p>
        </div>
        <div className="page-header-actions">
          <FormSelect
            className="min-w-[9rem] sm:min-w-[11.5rem]"
            value={chartDays}
            clearable={false}
            onChange={(e) => setChartDays(Number(e.target.value))}
            options={CHART_DAYS_OPTIONS}
          />
        </div>
      </div>

      <ReportsTabs />

      {summaryLoading && !summary && (
        <div className="loading-state">Loading sales summary...</div>
      )}

      {summaryError && !summaryLoading && <p className="error-text">{summaryError}</p>}

      {summary && stats && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-stretch">
          <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-[1.35rem] shadow-sm">
            <h2 className="m-0 mb-2.5 sm:mb-4 font-display text-base sm:text-[1.2rem] font-semibold tracking-[-0.02em] text-text">
              Quick Stats
            </h2>
            <ul className="m-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 list-none gap-2 sm:gap-[0.85rem] p-0">
              <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.75rem]">
                <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                  Revenue (Completed)
                </span>
                <strong className="text-sm sm:text-[1.2rem] font-bold tracking-[-0.02em] text-text">
                  {formatCurrency(stats.totalRevenueCompleted)}
                </strong>
              </li>
              <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.75rem]">
                <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                  Products Sold
                </span>
                <strong className="text-sm sm:text-[1.2rem] font-bold tracking-[-0.02em] text-text">
                  {stats.totalProductsSold}
                </strong>
              </li>
              <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.75rem]">
                <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                  Completed Sales
                </span>
                <strong className="text-sm sm:text-[1.2rem] font-bold tracking-[-0.02em] text-text">
                  {stats.completedSales}
                </strong>
              </li>
              <li className="flex flex-col gap-[0.2rem] rounded-xl border border-[rgba(245,158,11,0.12)] bg-[linear-gradient(180deg,#fffaf0,var(--color-surface-muted))] px-2.5 py-2 sm:px-[0.85rem] sm:py-[0.75rem]">
                <span className="text-[0.72rem] sm:text-[0.78rem] font-semibold text-text-secondary">
                  Cancelled Sales
                </span>
                <strong className="text-sm sm:text-[1.2rem] font-bold tracking-[-0.02em] text-text">
                  {stats.cancelledSales}
                </strong>
              </li>
            </ul>
          </div>

          <RevenueChart chart={summary.revenueChart} />
        </section>
      )}

      <section className="flex flex-col gap-3 sm:gap-4">
        <h2 className="m-0 font-display text-base sm:text-[1.2rem] font-semibold tracking-[-0.02em] text-text">
          All Sales History
        </h2>

        <ListingFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search name, bill no, product..."
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
            <label htmlFor="sales-report-from">From</label>
            <DateInput
              id="sales-report-from"
              value={from}
              onChange={handleFromChange}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="sales-report-to">To</label>
            <DateInput
              id="sales-report-to"
              value={to}
              onChange={handleToChange}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="sales-report-limit">Entry Per page</label>
            <FormSelect
              id="sales-report-limit"
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
            <label htmlFor="sales-report-columns">Columns</label>
            <ColumnPicker
              id="sales-report-columns"
              columns={SALE_TABLE_COLUMNS}
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

        {error && !loading && <p className="error-text">{error}</p>}

        {loading && <div className="loading-state">Loading sales report…</div>}

        {!loading && !error && sales.length === 0 && (
          <div className="empty-state">No sales found.</div>
        )}

        {!loading && !error && sales.length > 0 && (
          <SaleTable
            sales={sales}
            onPrintBill={handlePrintBill}
            printingId={printingId}
            companyName={settings?.company_name}
            showEdit={false}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            visibleColumns={visibleKeys}
            onViewSale={setViewingSale}
            onViewProduct={handleViewProduct}
          />
        )}

        <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />
      </section>

      {printSale && (
        <SaleBillPrint
          billNo={printSale.bill_no}
          form={saleToPrintForm(printSale)}
          settings={settings}
        />
      )}

      {printListRows && (
        <ListingPrintReport
          title="Sales Report"
          settings={settings}
          from={from}
          to={to}
          extraFilters={debouncedSearch.trim() ? `Search: ${debouncedSearch.trim()}` : null}
          columns={visibleColumns}
          rows={salesToListRows(printListRows)}
          totals={saleListTotals(printListRows, visibleColumns)}
        />
      )}

      <ProductInfoDialog
        open={!!viewingProduct}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
      />

      <SaleInfoDialog
        open={Boolean(viewingSale)}
        sale={viewingSale}
        onClose={() => setViewingSale(null)}
        onPrintBill={handlePrintBill}
        onViewProduct={handleViewProduct}
        companyName={settings?.company_name}
        printing={printingId === viewingSale?.id}
      />
    </div>
  )
}

export default ProductSalesReportPage

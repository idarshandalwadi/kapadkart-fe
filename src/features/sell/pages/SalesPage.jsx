import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchSales, updateSale } from '@/features/sell/api/sales'
import SaleBillPrint from '@/features/sell/components/SaleBillPrint'
import SaleTable from '@/features/sell/components/SaleTable'
import SaleInfoDialog from '@/features/sell/components/SaleInfoDialog'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import { fetchProductById } from '@/features/products/api/products'
import {
  SALE_LIMIT_OPTIONS,
  SALE_TABLE_COLUMNS,
  saleStatusLabel,
  isSaleCancellable,
} from '@/features/sell/constants/sales'
import { parseSelectedProducts, formatSelectedProductsNames, totalSelectedProductsQuantity } from '@/features/bookings/utils/bookingLineItems'
import { fetchSettings } from '@/features/settings/api/settings'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ColumnPicker from '@/shared/components/ColumnPicker'
import FormSelect from '@/shared/components/FormSelect'
import DateInput from '@/shared/components/DateInput'
import ListingPrintReport from '@/shared/components/ListingPrintReport'
import ListingFilterBar from '@/shared/components/ListingFilterBar'
import Pagination from '@/shared/components/Pagination'
import { useColumnVisibility } from '@/shared/hooks/useColumnVisibility'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/utils/cn'
import { formatDateDisplay } from '@/shared/utils/dateFormat'
import { fetchAllListPages } from '@/shared/utils/fetchAllListPages'
import { useTenant } from '@/shared/tenant/TenantContext'
import { printBill, printListingReport } from '@/shared/utils/printBill'

function formatListMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
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
      subtotal: formatListMoney(subtotal),
      discount: discount > 0 ? `-${formatListMoney(discount)}` : '₹0.00',
      total: formatListMoney(sale.sale_total),
      paid: formatListMoney(sale.paid_amount),
      status: saleStatusLabel(sale.status),
    }
  })
}

function saleListTotals(sales, columns) {
  const money = {
    subtotal: formatListMoney(sales.reduce((sum, row) => sum + (Number(row.subtotal) || (Number(row.sale_total || 0) + Number(row.discount_amount || 0))), 0)),
    discount: formatListMoney(sales.reduce((sum, row) => sum + (Number(row.discount_amount) || 0), 0)),
    total: formatListMoney(sales.reduce((sum, row) => sum + (Number(row.sale_total) || 0), 0)),
    paid: formatListMoney(sales.reduce((sum, row) => sum + (Number(row.paid_amount) || 0), 0)),
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

function saleToPrintForm(sale) {
  if (!sale) return null
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

function SalesPage() {
  const { path, slug } = useTenant()
  const [searchParams] = useSearchParams()
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    showAll: showAllColumns,
  } = useColumnVisibility(`kk:table-columns:${slug}:sales`, SALE_TABLE_COLUMNS)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(() => searchParams.get('from') || '')
  const [to, setTo] = useState(() => searchParams.get('to') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')

  const debouncedSearch = useDebouncedValue(search)

  const [sales, setSales] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [settings, setSettings] = useState(null)
  const [printSale, setPrintSale] = useState(null)
  const [printingId, setPrintingId] = useState(null)
  const [printListRows, setPrintListRows] = useState(null)
  const [printingList, setPrintingList] = useState(false)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [viewingSale, setViewingSale] = useState(null)

  const hasFilters = Boolean(search || from || to || statusFilter)

  const handleViewProduct = async (productId) => {
    try {
      const product = await fetchProductById(productId)
      setViewingProduct(product)
    } catch (err) {
      toast.error('Failed to load product details.')
    }
  }

  const loadSales = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const json = await fetchSales({
        page,
        limit,
        search: debouncedSearch.trim(),
        from,
        to,
        status: statusFilter || undefined,
        sort_by: 'bill_no',
        sort_order: 'desc',
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
  }, [page, limit, debouncedSearch, from, to, statusFilter])

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

  const clearFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
    setStatusFilter('')
    setPage(1)
  }

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
      printListingReport({ title: 'Sales', from, to })
    }, 50)
    const clearPrint = () => setPrintListRows(null)
    window.addEventListener('afterprint', clearPrint)

    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', clearPrint)
    }
  }, [printListRows, from, to])

  const handlePrintList = async () => {
    setPrintingList(true)
    try {
      const rows = await fetchAllListPages(fetchSales, {
        search: debouncedSearch.trim(),
        from,
        to,
        status: statusFilter || undefined,
        sort_by: 'bill_no',
        sort_order: 'desc',
      })
      if (!rows.length) {
        toast.error('No sales found for the selected filters')
        return
      }
      setPrintListRows(rows)
    } catch (err) {
      toast.error(err.message || 'Failed to load sales for printing')
    } finally {
      setPrintingList(false)
    }
  }

  const saleListFilters = debouncedSearch.trim()
    ? `Search: ${debouncedSearch.trim()}`
    : ''

  const handleCancelConfirm = async () => {
    if (!pendingCancel) return

    if (!isSaleCancellable(pendingCancel)) {
      toast.error('Cancellation is no longer allowed after 45 days from sale date.')
      setPendingCancel(null)
      return
    }

    setCancellingId(pendingCancel.id)
    try {
      await updateSale(pendingCancel.id, { status: 'cancelled' })
      toast.success('Sale cancelled and stock restored')
      setPendingCancel(null)
      await loadSales()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const activeChips = []
  if (from) {
    activeChips.push({ key: 'from', label: `From: ${from}`, onRemove: () => { setFrom(''); setPage(1) } })
  }
  if (to) {
    activeChips.push({ key: 'to', label: `To: ${to}`, onRemove: () => { setTo(''); setPage(1) } })
  }
  if (statusFilter) {
    activeChips.push({ key: 'status', label: `Status: ${saleStatusLabel(statusFilter)}`, onRemove: () => { setStatusFilter(''); setPage(1) } })
  }
  const activeFilterCount = (from ? 1 : 0) + (to ? 1 : 0) + (statusFilter ? 1 : 0)

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] animate-fade-up pb-12">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Sales Management</p>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Sales</h1>
            {pagination && (
              <span className="page-count">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="page-lead">Track completed sales and restore stock on cancel.</p>
        </div>
        <div className="page-header-actions">
          <Link to={path('/sales/add')} className="btn-primary !px-3 !py-1.5 !text-xs sm:!px-[1.1rem] sm:!py-[0.6rem] sm:!text-[0.88rem]">
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>New Sale</span>
          </Link>
        </div>
      </div>

      {/* QUICK STATUS CHIPS - Compact single scroll row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          { key: '', label: 'All Sales' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setStatusFilter(s.key)
              setPage(1)
            }}
            className={cn(
              'px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0',
              statusFilter === s.key
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-2xs'
                : s.key === 'cancelled'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ListingFilterBar
        search={search}
        onSearchChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        searchPlaceholder="Search name, phone, address, or product..."
        activeFilterCount={activeFilterCount}
        activeChips={activeChips}
        onClearAll={hasFilters ? clearFilters : null}
      >
        <div className="filter-field">
          <label htmlFor="filter-sale-from">From</label>
          <DateInput
            id="filter-sale-from"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-sale-to">To</label>
          <DateInput
            id="filter-sale-to"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-sale-limit">Entry Per page</label>
          <FormSelect
            id="filter-sale-limit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            options={SALE_LIMIT_OPTIONS.map((opt) => ({
              value: opt,
              label: String(opt),
            }))}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-sale-columns">Columns</label>
          <ColumnPicker
            id="filter-sale-columns"
            columns={SALE_TABLE_COLUMNS}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onShowAll={showAllColumns}
          />
        </div>

        <div className="filter-field self-end sm:col-span-2 md:col-span-1">
          <label className="hidden sm:block">&nbsp;</label>
          <button
            type="button"
            className={cn(
              'btn-primary',
              'h-9 sm:h-[2.65rem] w-full box-border justify-center px-3 sm:px-[0.95rem] text-xs sm:text-[0.85rem]',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:brightness-100',
            )}
            onClick={handlePrintList}
            disabled={loading || printingList}
            title="Print all sales matching the current filters"
          >
            <i
              className={cn('fa-solid', printingList ? 'fa-spinner fa-spin' : 'fa-print')}
              aria-hidden="true"
            />
            <span>{printingList ? 'Preparing…' : 'Print Sales'}</span>
          </button>
        </div>
      </ListingFilterBar>

      {loading && <div className="loading-state">Loading sales…</div>}

      {error && !loading && <p className="error-text">{error}</p>}

      {!loading && !error && sales.length === 0 && (
        <div className="empty-state">No sales found.</div>
      )}

      {!loading && !error && sales.length > 0 && (
        <SaleTable
          sales={sales}
          onCancel={setPendingCancel}
          onPrintBill={handlePrintBill}
          onViewSale={setViewingSale}
          onViewProduct={handleViewProduct}
          cancellingId={cancellingId}
          printingId={printingId}
          companyName={settings?.company_name}
          visibleColumns={visibleKeys}
        />
      )}

      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Cancel sale?"
        message={
          pendingCancel
            ? `Cancel sale bill ${pendingCancel.bill_no}? Stock will be restored.`
            : ''
        }
        confirmLabel="Cancel sale"
        cancelLabel="Keep sale"
        loading={Boolean(cancellingId)}
        onConfirm={handleCancelConfirm}
        onCancel={() => {
          if (!cancellingId) setPendingCancel(null)
        }}
      />

      {printSale && (
        <SaleBillPrint
          billNo={printSale.bill_no}
          form={saleToPrintForm(printSale)}
          settings={settings}
          sharedUrl={printSale.share_url || printSale.shared_url || printSale.download_url}
        />
      )}

      {printListRows && (
        <ListingPrintReport
          title="Sales"
          settings={settings}
          from={from}
          to={to}
          extraFilters={saleListFilters || null}
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
        onCancel={setPendingCancel}
        onViewProduct={handleViewProduct}
        companyName={settings?.company_name}
        printing={printingId === viewingSale?.id}
        cancelling={cancellingId === viewingSale?.id}
      />
    </div>
  )
}

export default SalesPage

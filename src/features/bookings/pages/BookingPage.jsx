import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchBookings, deleteBooking } from '@/features/bookings/api/bookings'
import BookingBillPrint from '@/features/bookings/components/BookingBillPrint'
import BookingTable from '@/features/bookings/components/BookingTable'
import BookingInfoDialog from '@/features/bookings/components/BookingInfoDialog'
import SendBookingDialog from '@/features/bookings/components/SendBookingDialog'
import ReturnBookingDialog from '@/features/bookings/components/ReturnBookingDialog'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import { fetchProductById } from '@/features/products/api/products'
import {
  calcLineTotal,
  formatSelectedProductsNames,
  parseSelectedProducts,
  totalSelectedProductsQuantity,
} from '@/features/bookings/utils/bookingLineItems'
import FormSelect from '@/shared/components/FormSelect'
import DateInput from '@/shared/components/DateInput'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ListingPrintReport from '@/shared/components/ListingPrintReport'
import ListingFilterBar from '@/shared/components/ListingFilterBar'
import {
  BOOKING_LIMIT_OPTIONS,
  BOOKING_TABLE_COLUMNS,
} from '@/features/bookings/constants/bookings'
import { fetchSettings } from '@/features/settings/api/settings'
import ColumnPicker from '@/shared/components/ColumnPicker'
import Pagination from '@/shared/components/Pagination'
import { TableCardSkeleton } from '@/shared/components/skeletons'
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
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function bookingsToListRows(bookings) {
  return bookings.map((booking) => ({
    id: booking.id,
    bill_no: booking.bill_no || '—',
    booking_date: formatDateDisplay(booking.created_at),
    customer: booking.customer_name || '—',
    phone: booking.phone_number || '—',
    address: booking.village_address || '—',
    pickup_date: formatDateDisplay(booking.pickup_date || booking.use_date),
    order_date: formatDateDisplay(booking.pickup_date || booking.use_date),
    return_date: formatDateDisplay(booking.return_date),
    products:
      booking.items && booking.items.length > 0
        ? booking.items.map((it) => `${it.product?.product_name || 'Item'} × ${it.quantity}`).join(', ')
        : formatSelectedProductsNames(booking.selected_products),
    qty:
      booking.items && booking.items.length > 0
        ? booking.items.reduce((s, it) => s + it.quantity, 0)
        : totalSelectedProductsQuantity(booking.selected_products) ?? '—',
    total: formatListMoney(booking.rental_total),
    paid: formatListMoney(booking.paid_amount),
    due: formatListMoney(booking.due_amount),
  }))
}

function bookingListTotals(bookings, columns) {
  const money = {
    total: formatListMoney(bookings.reduce((sum, row) => sum + (Number(row.rental_total) || 0), 0)),
    paid: formatListMoney(bookings.reduce((sum, row) => sum + (Number(row.paid_amount) || 0), 0)),
    due: formatListMoney(bookings.reduce((sum, row) => sum + (Number(row.due_amount) || 0), 0)),
  }
  const countLabel = `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`
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

function bookingToPrintForm(booking) {
  if (!booking) return null
  const { legacyText, rentalDays } = parseSelectedProducts(booking.selected_products)
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
    : (parseSelectedProducts(booking.selected_products).items || []).map((it) => {
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

function BookingPage() {
  const { path, slug } = useTenant()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    showAll: showAllColumns,
  } = useColumnVisibility(`kk:table-columns:${slug}:bookings`, BOOKING_TABLE_COLUMNS)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const activeTab = searchParams.get('tab') || 'all'
  const statusFilter = searchParams.get('status') || ''

  const debouncedSearch = useDebouncedValue(search)

  const [bookings, setBookings] = useState([])
  const [tabCounts, setTabCounts] = useState({ bookings: 0, deliveries: 0, returns: 0, all: 0 })
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [printBooking, setPrintBooking] = useState(null)
  const [printingId, setPrintingId] = useState(null)
  const [sendBookingTarget, setSendBookingTarget] = useState(null)
  const [returnBookingTarget, setReturnBookingTarget] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [printListRows, setPrintListRows] = useState(null)
  const [printingList, setPrintingList] = useState(false)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [viewingBooking, setViewingBooking] = useState(null)

  const handleViewProduct = async (productId) => {
    try {
      const product = await fetchProductById(productId)
      setViewingProduct(product)
    } catch (err) {
      toast.error('Failed to load product details.')
    }
  }

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const json = await fetchBookings({
        page,
        limit,
        search: debouncedSearch.trim(),
        from: activeTab === 'all' ? from : undefined,
        to: activeTab === 'all' ? to : undefined,
        status: activeTab === 'all' ? (statusFilter || undefined) : undefined,
        tab: activeTab !== 'all' ? activeTab : undefined,
      })

      setBookings(json.data ?? [])
      setPagination(json.pagination ?? null)
      if (json.tab_counts) {
        setTabCounts(json.tab_counts)
      }
    } catch (err) {
      setBookings([])
      setPagination(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, from, to, statusFilter, activeTab])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, activeTab])

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

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value))
    setPage(1)
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

  const handleTabChange = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (key && key !== 'all') {
        next.set('tab', key)
      } else {
        next.delete('tab')
      }
      next.delete('status')
      return next
    }, { replace: true })
    setPage(1)
  }

  const applyStatusFilter = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (key) next.set('status', key)
      else next.delete('status')
      return next
    }, { replace: true })
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
    applyStatusFilter('')
    setPage(1)
  }

  const handlePrintBill = (booking) => {
    setPrintingId(booking.id)
    setPrintBooking(booking)
  }

  useEffect(() => {
    if (location.state?.autoPrintBooking) {
      const target = location.state.autoPrintBooking
      window.history.replaceState({ ...location.state, autoPrintBooking: undefined }, '')
      handlePrintBill(target)
    }
  }, [location.state])

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
      printListingReport({ title: 'Rentals', from, to })
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
      const rows = await fetchAllListPages(fetchBookings, {
        search: debouncedSearch.trim(),
        from,
        to,
        status: statusFilter || undefined,
      })
      if (!rows.length) {
        toast.error('No rentals found for the selected filters')
        return
      }
      setPrintListRows(rows)
    } catch (err) {
      toast.error(err.message || 'Failed to load rentals for printing')
    } finally {
      setPrintingList(false)
    }
  }

  const handleDeleteRequest = (booking) => {
    setPendingDelete(booking)
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return

    setDeletingId(pendingDelete.id)
    setError(null)

    try {
      await deleteBooking(pendingDelete.id)
      toast.success(`Deleted rental ${pendingDelete.bill_no}`)

      setPendingDelete(null)
      await loadBookings()
    } catch (err) {
      toast.error(err.message)
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const activeChips = []
  if (debouncedSearch) {
    activeChips.push({ key: 'search', label: `Search: ${debouncedSearch}`, onRemove: () => { setSearch(''); setPage(1) } })
  }
  if (activeTab === 'all') {
    if (from) {
      activeChips.push({ key: 'from', label: `From: ${from}`, onRemove: () => { setFrom(''); setPage(1) } })
    }
    if (to) {
      activeChips.push({ key: 'to', label: `To: ${to}`, onRemove: () => { setTo(''); setPage(1) } })
    }
    if (statusFilter) {
      const statusLabels = {
        booked: 'Reserved / Booked',
        sent: 'Dispatched (Sent)',
        returned: 'Returned',
        cancelled: 'Cancelled',
      }
      activeChips.push({ key: 'status', label: `Status: ${statusLabels[statusFilter] || statusFilter}`, onRemove: () => applyStatusFilter('') })
    }
  }
  const hasFilters = search || (activeTab === 'all' && (from || to || statusFilter))
  const activeFilterCount = activeChips.length

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] animate-fade-up pb-12">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">
            {activeTab === 'bookings' && 'New Bookings & Reservations'}
            {activeTab === 'deliveries' && 'Deliveries & Handover'}
            {activeTab === 'returns' && 'Return Inflow & Inspection'}
            {activeTab === 'all' && 'Master Rentals Ledger'}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="page-title">
              {activeTab === 'bookings' && 'Bookings'}
              {activeTab === 'deliveries' && 'Deliveries (0–6 Days)'}
              {activeTab === 'returns' && 'Returns'}
              {activeTab === 'all' && 'All Rentals'}
            </h1>
            {pagination && (
              <span className="page-count">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="page-lead">
            {activeTab === 'bookings' && 'Advance customer rental bookings awaiting fulfillment and pickup preparation.'}
            {activeTab === 'deliveries' && 'Orders scheduled for customer pickup from today to next 6 days (including pending pickups).'}
            {activeTab === 'returns' && 'Garments currently with customers awaiting return, inspection, and security deposit settlement.'}
            {activeTab === 'all' && 'Search and filter the complete rental history across all dates, statuses, and customers.'}
          </p>
        </div>
        <div className="page-header-actions flex items-center gap-2">
          <Link
            to={path('/booking/calendar')}
            className="btn-secondary !px-3 !py-1.5 !text-xs sm:!px-[1.1rem] sm:!py-[0.6rem] sm:!text-[0.88rem] inline-flex items-center gap-1.5"
            title="Inspect Item Availability & Calendar Schedule"
          >
            <i className="fa-solid fa-calendar-days text-accent" aria-hidden="true" />
            <span>Availability &amp; Calendar</span>
          </Link>
          <Link to={path('/booking/add')} className="btn-primary !px-3 !py-1.5 !text-xs sm:!px-[1.1rem] sm:!py-[0.6rem] sm:!text-[0.88rem]">
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>New Rental</span>
          </Link>
        </div>
      </div>

      {/* 4 PRIMARY OPERATIONAL STAGE TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3 py-0.5">
        {[
          { key: 'bookings', label: 'Bookings', sub: 'New & Advance', icon: 'fa-solid fa-calendar-plus', count: tabCounts.bookings },
          { key: 'deliveries', label: 'Deliveries', sub: 'Today to 6 Days', icon: 'fa-solid fa-truck-ramp-box', count: tabCounts.deliveries, highlight: tabCounts.deliveries > 0 },
          { key: 'returns', label: 'Returns', sub: 'Awaiting Return', icon: 'fa-solid fa-arrow-rotate-left', count: tabCounts.returns, highlight: tabCounts.returns > 0 },
          { key: 'all', label: 'All Rentals', sub: 'Search & History', icon: 'fa-solid fa-list-check', count: tabCounts.all },
        ].map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'group relative flex items-center justify-between gap-2.5 rounded-2xl p-2.5 sm:p-3 border transition-all cursor-pointer text-left',
                isActive
                  ? 'border-accent bg-accent-soft/40 dark:bg-accent/15 text-text shadow-xs ring-2 ring-accent/30 dark:ring-accent/40 font-bold'
                  : 'border-border bg-white text-text-secondary hover:border-border-strong hover:bg-surface-muted/60 hover:text-text'
              )}
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className={cn(
                  'inline-flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface-muted text-text-secondary group-hover:bg-accent-soft group-hover:text-accent-text'
                )}>
                  <i className={tab.icon} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[0.84rem] font-bold leading-tight truncate">
                    {tab.label}
                  </div>
                  <div className={cn(
                    'text-[0.65rem] sm:text-[0.68rem] leading-tight mt-0.5 truncate',
                    isActive ? 'text-accent-text font-semibold' : 'text-text-muted'
                  )}>
                    {tab.sub}
                  </div>
                </div>
              </div>
              <span className={cn(
                'ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[0.7rem] sm:text-xs font-mono font-bold shrink-0',
                isActive
                  ? 'bg-accent text-white shadow-2xs'
                  : tab.highlight
                    ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-400 font-bold border border-amber-500/25'
                    : 'bg-surface-muted text-text-muted font-semibold'
              )}>
                {tab.count ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* ALL RENTALS SUB-STATUS FILTER CHIPS */}
      {activeTab === 'all' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { key: '', label: 'All Statuses' },
            { key: 'booked', label: 'Reserved / Booked' },
            { key: 'sent', label: 'Dispatched (Sent)' },
            { key: 'returned', label: 'Returned' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => applyStatusFilter(s.key)}
              className={cn(
                'px-3 py-1 sm:px-3 sm:py-1 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0',
                statusFilter === s.key
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-2xs'
                  : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <ListingFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={
          activeTab === 'bookings'
            ? 'Search advance bookings by customer, bill no, phone...'
            : activeTab === 'deliveries'
              ? 'Search pickups by customer, bill no, phone...'
              : activeTab === 'returns'
                ? 'Search active rentals by customer, bill no, phone...'
                : 'Search name, bill no, phone, address, or product...'
        }
        activeFilterCount={activeFilterCount}
        activeChips={activeChips}
        onClearAll={hasFilters ? clearFilters : null}
      >
        {activeTab === 'all' && (
          <>
            <div className="filter-field">
              <label htmlFor="filter-booking-from">From</label>
              <DateInput
                id="filter-booking-from"
                value={from}
                onChange={handleFromChange}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="filter-booking-to">To</label>
              <DateInput
                id="filter-booking-to"
                value={to}
                onChange={handleToChange}
              />
            </div>
          </>
        )}

        <div className="filter-field">
          <label htmlFor="filter-booking-limit">Entry Per page</label>
          <FormSelect
            id="filter-booking-limit"
            value={limit}
            onChange={handleLimitChange}
            options={BOOKING_LIMIT_OPTIONS.map((opt) => ({
              value: opt,
              label: String(opt),
            }))}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-booking-columns">Columns</label>
          <ColumnPicker
            id="filter-booking-columns"
            columns={BOOKING_TABLE_COLUMNS}
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
            title="Print all bookings matching the current filters"
          >
            <i
              className={cn('fa-solid', printingList ? 'fa-spinner fa-spin' : 'fa-print')}
              aria-hidden="true"
            />
            <span>{printingList ? 'Preparing…' : 'Print Rentals'}</span>
          </button>
        </div>
      </ListingFilterBar>

      {loading && <TableCardSkeleton rows={6} cols={visibleKeys.length || 8} />}

      {error && !loading && <p className="error-text">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state flex flex-col items-center justify-center py-10 sm:py-14 px-4 text-center">
          <div className="size-12 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center mb-3 text-lg shadow-xs">
            <i className={cn(
              'fa-solid',
              activeTab === 'bookings' ? 'fa-calendar-plus' :
              activeTab === 'deliveries' ? 'fa-truck-ramp-box' :
              activeTab === 'returns' ? 'fa-arrow-rotate-left' : 'fa-list-check'
            )} aria-hidden="true" />
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-text mb-1">
            {activeTab === 'bookings' && 'No Advance Bookings'}
            {activeTab === 'deliveries' && 'No Deliveries Due (0–6 Days)'}
            {activeTab === 'returns' && 'No Rentals Awaiting Return'}
            {activeTab === 'all' && 'No Rentals Found'}
          </h3>
          <p className="text-xs sm:text-sm text-text-muted max-w-md mb-4 leading-relaxed">
            {activeTab === 'bookings' && 'Advance bookings scheduled beyond the next 6 days will appear here.'}
            {activeTab === 'deliveries' && 'All current orders are fulfilled. Upcoming pickups will appear as scheduled.'}
            {activeTab === 'returns' && 'No garments are currently out with customers awaiting return.'}
            {activeTab === 'all' && 'No rental bookings match your search or filter criteria.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {activeTab !== 'all' && tabCounts.all > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className="btn-secondary !py-1.5 !px-3.5 !text-xs font-semibold"
              >
                <i className="fa-solid fa-list-check" aria-hidden="true" />
                <span>View All Rentals ({tabCounts.all})</span>
              </button>
            )}
            <Link
              to={path('/booking/add')}
              className="btn-primary !py-1.5 !px-3.5 !text-xs font-semibold"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
              <span>New Rental</span>
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <BookingTable
          bookings={bookings}
          onPrintBill={handlePrintBill}
          onSend={(b) => setSendBookingTarget(b)}
          onProcessReturn={(b) => setReturnBookingTarget(b)}
          onDelete={handleDeleteRequest}
          onViewProduct={handleViewProduct}
          onViewBooking={setViewingBooking}
          printingId={printingId}
          deletingId={deletingId}
          visibleColumns={visibleKeys}
        />
      )}

      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} className="mt-6" />

      {sendBookingTarget && (
        <SendBookingDialog
          booking={sendBookingTarget}
          onClose={() => setSendBookingTarget(null)}
          onSuccess={loadBookings}
        />
      )}

      {returnBookingTarget && (
        <ReturnBookingDialog
          booking={returnBookingTarget}
          onClose={() => setReturnBookingTarget(null)}
          onSuccess={loadBookings}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete booking"
        message={
          pendingDelete
            ? `Delete booking ${pendingDelete.bill_no} for ${pendingDelete.customer_name || 'this customer'}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={Boolean(deletingId)}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deletingId) setPendingDelete(null)
        }}
      />

      {printBooking && (
        <BookingBillPrint
          billNo={printBooking.bill_no}
          form={bookingToPrintForm(printBooking)}
          settings={settings}
          sharedUrl={printBooking.share_url || printBooking.shared_url || printBooking.download_url}
        />
      )}

      {printListRows && (
        <ListingPrintReport
          title="Bookings"
          settings={settings}
          from={from}
          to={to}
          extraFilters={debouncedSearch.trim() ? `Search: ${debouncedSearch.trim()}` : null}
          columns={visibleColumns}
          rows={bookingsToListRows(printListRows)}
          totals={bookingListTotals(printListRows, visibleColumns)}
        />
      )}

      <ProductInfoDialog
        open={!!viewingProduct}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
      />

      <BookingInfoDialog
        open={Boolean(viewingBooking)}
        booking={viewingBooking}
        onClose={() => setViewingBooking(null)}
        onPrintBill={handlePrintBill}
        onViewProduct={handleViewProduct}
        onSend={(b) => {
          setViewingBooking(null)
          setSendBookingTarget(b)
        }}
        onProcessReturn={(b) => {
          setViewingBooking(null)
          setReturnBookingTarget(b)
        }}
        onDelete={(b) => {
          setViewingBooking(null)
          handleDeleteRequest(b)
        }}
        companyName={settings?.company_name}
        printing={printingId === viewingBooking?.id}
      />
    </div>
  )
}

export default BookingPage

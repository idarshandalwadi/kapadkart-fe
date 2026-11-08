import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchRentalAvailability, fetchRentalCalendar, fetchBookingById } from '@/features/bookings/api/bookings'
import { fetchProducts } from '@/features/products/api/products'
import BookingInfoDialog from '@/features/bookings/components/BookingInfoDialog'
import SearchableSelect from '@/shared/components/SearchableSelect'
import { useTenant } from '@/shared/tenant/TenantContext'
import { cn } from '@/shared/utils/cn'
import { formatDateDisplay } from '@/shared/utils/dateFormat'

function formatMoney(amount) {
  const num = Number(amount || 0)
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function toLocalDatetimeInput(date) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function RentalCalendarPage() {
  const { path } = useTenant()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('availability') // 'availability' | 'calendar'

  // Availability Search State
  const now = useMemo(() => new Date(), [])
  const defaultPickup = useMemo(() => {
    const d = new Date(now)
    d.setHours(9, 0, 0, 0)
    return toLocalDatetimeInput(d)
  }, [now])
  const defaultReturn = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() + 3)
    d.setHours(21, 0, 0, 0)
    return toLocalDatetimeInput(d)
  }, [now])

  const [search, setSearch] = useState('')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [pickupDate, setPickupDate] = useState(defaultPickup)
  const [returnDate, setReturnDate] = useState(defaultReturn)
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [availItems, setAvailItems] = useState([])
  const [expandedConflictId, setExpandedConflictId] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchBoxRef = useRef(null)

  // Calendar State
  const [selectedProductId, setSelectedProductId] = useState('all')
  const [rentalProducts, setRentalProducts] = useState([])
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [calendarView, setCalendarView] = useState('month') // 'month' | 'agenda'
  const [selectedDayNumber, setSelectedDayNumber] = useState(null)

  // Real-time suggestions for Available Items Search
  const searchSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    return rentalProducts
      .filter((p) => {
        const name = (p.product_name || '').toLowerCase()
        const code = (p.product_code || '').toLowerCase()
        const size = (p.size || '').toLowerCase()
        const cat = (p.category || '').toLowerCase()
        return name.includes(term) || code.includes(term) || size.includes(term) || cat.includes(term)
      })
      .slice(0, 8)
  }, [search, rentalProducts])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSuggestion = (product) => {
    setSearch(product.product_name)
    if (product.size && ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'].includes(product.size)) {
      setSizeFilter(product.size)
    }
    setShowSuggestions(false)
  }

  // Searchable Product Options
  const productOptions = useMemo(() => {
    return [
      {
        value: 'all',
        label: `All Rental Items (${rentalProducts.length})`,
      },
      ...rentalProducts.map((p) => {
        const hintParts = []
        if (p.product_code) hintParts.push(`#${p.product_code}`)
        if (p.size) hintParts.push(`Size: ${p.size}`)
        if (p.category) hintParts.push(p.category)
        return {
          value: String(p.id),
          label: p.product_name,
          hint: hintParts.join(' · '),
        }
      }),
    ]
  }, [rentalProducts])

  // Booking Info Dialog
  const [viewingBooking, setViewingBooking] = useState(null)
  const [loadingBookingDetails, setLoadingBookingDetails] = useState(false)

  // Load rental products for calendar dropdown
  useEffect(() => {
    fetchProducts({ availability_type: 'rent', limit: 200 })
      .then((res) => {
        const list = res.data || res.products || []
        setRentalProducts(list)
      })
      .catch(() => {})
  }, [])

  // Fetch Availability Search
  const loadAvailability = async () => {
    if (!pickupDate || !returnDate) {
      toast.error('Please specify both Pickup and Return dates')
      return
    }
    if (new Date(returnDate) <= new Date(pickupDate)) {
      toast.error('Return date must be after Pickup date')
      return
    }

    setLoadingAvail(true)
    try {
      const res = await fetchRentalAvailability({
        search: search.trim() || undefined,
        size: sizeFilter !== 'all' ? sizeFilter : undefined,
        pickup_date: new Date(pickupDate).toISOString(),
        return_date: new Date(returnDate).toISOString(),
        limit: 100,
      })
      setAvailItems(res.data || [])
    } catch (err) {
      toast.error(err.message || 'Failed to check availability')
    } finally {
      setLoadingAvail(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'availability') {
      loadAvailability()
    }
  }, [activeTab, sizeFilter])

  // Fetch Calendar Events
  const loadCalendar = async () => {
    setLoadingCalendar(true)
    try {
      const y = calendarDate.getFullYear()
      const m = calendarDate.getMonth()
      const from = new Date(y, m, 1, 0, 0, 0).toISOString()
      const to = new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString()

      const pId = typeof selectedProductId === 'string' ? selectedProductId : 'all'

      const res = await fetchRentalCalendar({
        product_id: pId !== 'all' ? pId : undefined,
        from,
        to,
      })
      setCalendarEvents(res.data || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load booking schedule')
    } finally {
      setLoadingCalendar(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadCalendar()
    }
  }, [activeTab, calendarDate, selectedProductId])

  // Handle click on booking bar
  const handleOpenBooking = async (bookingId) => {
    if (!bookingId) return
    setLoadingBookingDetails(true)
    try {
      const details = await fetchBookingById(bookingId)
      setViewingBooking(details)
    } catch (err) {
      toast.error(err.message || 'Could not load booking details')
    } finally {
      setLoadingBookingDetails(false)
    }
  }

  // Pre-fill booking form
  const handleBookItem = (product) => {
    navigate(path('/booking/add'), {
      state: {
        prefillProduct: product,
        prefillPickup: pickupDate,
        prefillReturn: returnDate,
      },
    })
  }

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const y = calendarDate.getFullYear()
    const m = calendarDate.getMonth()
    const firstDayIndex = new Date(y, m, 1).getDay() // 0 = Sun
    const totalDays = new Date(y, m + 1, 0).getDate()

    const days = []
    // Empty prefix cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ empty: true, key: `empty-${i}` })
    }
    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(y, m, d)
      const isToday =
        dateObj.getDate() === now.getDate() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getFullYear() === now.getFullYear()

      // Find events overlapping this day
      const dayStart = new Date(y, m, d, 0, 0, 0)
      const dayEnd = new Date(y, m, d, 23, 59, 59, 999)

      const eventsForDay = calendarEvents.filter((ev) => {
        const start = new Date(ev.start_date)
        const end = new Date(ev.end_date)
        return start <= dayEnd && end >= dayStart
      })

      days.push({
        dayNumber: d,
        dateObj,
        isToday,
        events: eventsForDay,
        key: `day-${d}`,
      })
    }
    return days
  }, [calendarDate, calendarEvents, now])

  // Agenda list grouping (for mobile / list view)
  const agendaGroups = useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) return []
    const y = calendarDate.getFullYear()
    const m = calendarDate.getMonth()
    const totalDays = new Date(y, m + 1, 0).getDate()

    const groups = []
    for (let d = 1; d <= totalDays; d++) {
      const dayStart = new Date(y, m, d, 0, 0, 0)
      const dayEnd = new Date(y, m, d, 23, 59, 59, 999)

      const eventsForDay = calendarEvents.filter((ev) => {
        const start = new Date(ev.start_date)
        const end = new Date(ev.end_date)
        return start <= dayEnd && end >= dayStart
      })

      if (eventsForDay.length > 0) {
        groups.push({
          dayNumber: d,
          dateObj: new Date(y, m, d),
          events: eventsForDay,
        })
      }
    }
    return groups
  }, [calendarDate, calendarEvents])

  // Currently focused day for detail panel
  const activeDaySchedule = useMemo(() => {
    if (selectedDayNumber) {
      return calendarDays.find((cd) => !cd.empty && cd.dayNumber === selectedDayNumber) || null
    }
    // Default to today if in current month and has events
    const todayCell = calendarDays.find((cd) => !cd.empty && cd.isToday && cd.events.length > 0)
    if (todayCell) return todayCell
    // Otherwise first day in month that has events
    return calendarDays.find((cd) => !cd.empty && cd.events.length > 0) || null
  }, [calendarDays, selectedDayNumber])

  const monthYearLabel = calendarDate.toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-5 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <i className="fa-solid fa-calendar-days text-sm" />
            </span>
            <h1 className="m-0 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
              Rental Availability &amp; Booking Calendar
            </h1>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Check live inventory availability for target dates and inspect item booking schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={path('/booking')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text shadow-sm transition hover:bg-surface-muted"
          >
            <i className="fa-solid fa-list-check" />
            All Rentals
          </Link>
          <Link
            to={path('/booking/add')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent/90"
          >
            <i className="fa-solid fa-plus" />
            New Rental
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'availability'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-secondary hover:text-text'
          )}
        >
          <i className="fa-solid fa-boxes-stacked" />
          <span>Available Items Search</span>
          {availItems.length > 0 && activeTab === 'availability' && (
            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.65rem] text-accent-text font-bold">
              {availItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'calendar'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-secondary hover:text-text'
          )}
        >
          <i className="fa-solid fa-calendar-week" />
          <span>Item Booking Calendar</span>
          {calendarEvents.length > 0 && activeTab === 'calendar' && (
            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.65rem] text-accent-text font-bold">
              {calendarEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: AVAILABLE ITEMS SEARCH */}
      {activeTab === 'availability' && (
        <div className="space-y-4">
          {/* Search Filter Card */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadAvailability()
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              {/* Product Name / Code Search with Autocomplete Suggestions */}
              <div className="relative lg:col-span-2" ref={searchBoxRef}>
                <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                  Product Name or Code
                </label>
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => {
                      if (search.trim()) setShowSuggestions(true)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowSuggestions(false)
                    }}
                    placeholder="Search by name, code (e.g. 15546656)..."
                    className="w-full rounded-xl border border-border bg-white pl-9 pr-8 py-2 text-xs text-text transition focus:border-accent focus:outline-none"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        setShowSuggestions(false)
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs cursor-pointer p-0.5"
                      title="Clear search"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>

                {/* Suggestions Popover */}
                {showSuggestions && search.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-xl">
                    <div className="px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-text-muted border-b border-border/50">
                      Product Suggestions ({searchSuggestions.length})
                    </div>
                    {searchSuggestions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-text-muted">
                        No matching rental items found
                      </div>
                    ) : (
                      searchSuggestions.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(prod)}
                          className="w-full text-left rounded-lg p-2 hover:bg-accent-soft/40 transition flex items-center justify-between gap-2 cursor-pointer border-b border-border/30 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-text truncate">
                              {prod.product_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.68rem] text-text-muted mt-0.5">
                              {prod.product_code && (
                                <span className="font-mono font-semibold text-text-secondary">
                                  #{prod.product_code}
                                </span>
                              )}
                              {prod.size && <span>· Size: <strong className="text-text">{prod.size}</strong></span>}
                              {prod.category && <span>· {prod.category}</span>}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-xs font-bold text-accent-text">
                              {formatMoney(prod.daily_rent)}
                            </span>
                            <span className="block text-[0.62rem] text-text-muted">/ day</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Product Size Filter */}
              <div>
                <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                  Size
                </label>
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-text transition focus:border-accent focus:outline-none cursor-pointer"
                >
                  <option value="all">All Sizes</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="Free">Free Size</option>
                </select>
              </div>

              {/* Pickup Date & Time */}
              <div>
                <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                  Pickup Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-2.5 py-2 text-xs text-text transition focus:border-accent focus:outline-none"
                />
              </div>

              {/* Return Date & Time */}
              <div>
                <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                  Return Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-2.5 py-2 text-xs text-text transition focus:border-accent focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setSizeFilter('all')
                    setPickupDate(defaultPickup)
                    setReturnDate(defaultReturn)
                  }}
                  className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-muted cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loadingAvail}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
                >
                  {loadingAvail ? (
                    <i className="fa-solid fa-spinner animate-spin" />
                  ) : (
                    <i className="fa-solid fa-filter" />
                  )}
                  Check Availability
                </button>
              </div>
            </form>
          </div>

          {/* Availability Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text-secondary">
                {availItems.length} items found for selected window (
                {formatDateDisplay(pickupDate)} &rarr; {formatDateDisplay(returnDate)})
              </span>
            </div>

            {loadingAvail ? (
              <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-border bg-white p-8">
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl text-accent" />
                  <span className="text-xs font-medium">Checking live bookings &amp; inventory...</span>
                </div>
              </div>
            ) : availItems.length === 0 ? (
              <div className="flex min-h-[25vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                <i className="fa-solid fa-box-open text-3xl text-text-muted mb-2" />
                <h3 className="font-bold text-sm text-text">No Rental Items Found</h3>
                <p className="text-xs text-text-muted max-w-sm mt-0.5">
                  Try adjusting your search criteria or date window to check other items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {availItems.map((item) => {
                  const isAvailable = item.is_available && item.available_quantity > 0
                  const hasConflicts = item.conflicting_bookings && item.conflicting_bookings.length > 0
                  const isExpanded = expandedConflictId === item.id

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition duration-160',
                        isAvailable
                          ? 'border-border bg-white hover:border-emerald-500/40 hover:shadow-sm'
                          : 'border-rose-200 bg-rose-50/20'
                      )}
                    >
                      <div>
                        {/* Top info row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-sm text-text truncate" title={item.product_name}>
                              {item.product_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                              {item.product_code && (
                                <span className="font-mono font-semibold text-text-secondary">
                                  #{item.product_code}
                                </span>
                              )}
                              {item.size && (
                                <span>· Size: <strong className="text-text">{item.size}</strong></span>
                              )}
                              {item.category && <span>· {item.category}</span>}
                            </div>
                          </div>

                          {/* Availability Badge */}
                          <div className="shrink-0">
                            {isAvailable ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[0.72rem] font-bold text-emerald-700">
                                <i className="fa-solid fa-circle-check text-[0.65rem]" />
                                Available ({item.available_quantity} of {item.total_quantity})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-[0.72rem] font-bold text-rose-700">
                                <i className="fa-solid fa-circle-xmark text-[0.65rem]" />
                                Fully Booked (0 left)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inventory & Pricing details */}
                        <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-surface-muted/60 p-2 text-center text-xs">
                          <div>
                            <span className="block text-[0.65rem] text-text-muted">Total Units</span>
                            <span className="font-bold text-text">{item.total_quantity}</span>
                          </div>
                          <div>
                            <span className="block text-[0.65rem] text-text-muted">Reserved</span>
                            <span className={cn('font-bold', item.booked_quantity > 0 ? 'text-amber-600' : 'text-text')}>
                              {item.booked_quantity}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[0.65rem] text-text-muted">Daily Rent</span>
                            <span className="font-bold text-accent-text">{formatMoney(item.daily_rent)}</span>
                          </div>
                        </div>

                        {/* Conflicting bookings toggle */}
                        {hasConflicts && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedConflictId(isExpanded ? null : item.id)}
                              className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-text-secondary hover:text-accent cursor-pointer"
                            >
                              <i className={cn('fa-solid text-[0.65rem]', isExpanded ? 'fa-chevron-up' : 'fa-chevron-down')} />
                              {item.conflicting_bookings.length} overlapping booking(s) in this window
                            </button>

                            {isExpanded && (
                              <div className="mt-1.5 space-y-1.5 rounded-lg border border-border/80 bg-white p-2 text-[0.72rem]">
                                {item.conflicting_bookings.map((cb, idx) => (
                                  <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-1 last:border-0 last:pb-0">
                                    <div>
                                      <span className="font-bold text-text">#{cb.bill_no}</span>
                                      <span className="text-text-muted"> — {cb.customer_name}</span>
                                    </div>
                                    <div className="text-[0.68rem] text-text-secondary font-mono">
                                      {formatDateDisplay(cb.pickup_date)} &rarr; {formatDateDisplay(cb.return_date)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom action button */}
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        <span className="text-[0.72rem] font-medium text-text-muted">
                          {isAvailable ? 'Ready for booking' : 'Unavailable for chosen dates'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleBookItem(item)}
                          disabled={!isAvailable}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <i className="fa-solid fa-calendar-plus" />
                          Book This Item
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ITEM BOOKING CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Control Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 sm:p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            {/* Searchable Product Dropdown */}
            <div className="w-full lg:max-w-md">
              <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-text-secondary">
                Filter by Rental Item
              </label>
              <SearchableSelect
                value={typeof selectedProductId === 'string' ? selectedProductId : 'all'}
                onChange={(e) => {
                  const val = typeof e === 'string' ? e : e?.target?.value ?? 'all'
                  setSelectedProductId(typeof val === 'string' ? val : 'all')
                  setSelectedDayNumber(null)
                }}
                options={productOptions}
                placeholder="Search item by name, code, size..."
                clearable={false}
                className="w-full"
              />
            </div>

            {/* View Mode Toggle + Month Navigation */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-1 lg:pt-0">
              {/* View Mode Toggle */}
              <div className="inline-flex rounded-xl bg-surface-muted p-1 border border-border/60">
                <button
                  type="button"
                  onClick={() => setCalendarView('month')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                    calendarView === 'month'
                      ? 'bg-white text-text shadow-xs'
                      : 'text-text-muted hover:text-text'
                  )}
                  title="Month Grid View"
                >
                  <i className="fa-solid fa-table-cells text-[0.75rem]" />
                  <span>Month</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('agenda')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                    calendarView === 'agenda'
                      ? 'bg-white text-text shadow-xs'
                      : 'text-text-muted hover:text-text'
                  )}
                  title="Schedule List View"
                >
                  <i className="fa-solid fa-list-ul text-[0.75rem]" />
                  <span>Schedule List</span>
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(calendarDate)
                    d.setMonth(d.getMonth() - 1)
                    setCalendarDate(d)
                    setSelectedDayNumber(null)
                  }}
                  className="rounded-xl border border-border bg-white p-2 text-xs text-text hover:bg-surface-muted transition cursor-pointer"
                  title="Previous Month"
                >
                  <i className="fa-solid fa-chevron-left px-0.5" />
                </button>

                <span className="font-display font-bold text-xs sm:text-sm text-text min-w-28 sm:min-w-36 text-center">
                  {monthYearLabel}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(calendarDate)
                    d.setMonth(d.getMonth() + 1)
                    setCalendarDate(d)
                    setSelectedDayNumber(null)
                  }}
                  className="rounded-xl border border-border bg-white p-2 text-xs text-text hover:bg-surface-muted transition cursor-pointer"
                  title="Next Month"
                >
                  <i className="fa-solid fa-chevron-right px-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalendarDate(new Date())
                    setSelectedDayNumber(new Date().getDate())
                  }}
                  className="rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-surface-muted transition cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: MONTH GRID VIEW */}
          {calendarView === 'month' && (
            <div className="space-y-4">
              {/* Calendar Grid Container (Horizontally scrollable on mobile if needed) */}
              <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[620px] sm:min-w-0">
                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 border-b border-border bg-surface-muted/40 text-center text-xs font-bold text-text-secondary py-2.5">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    {/* Calendar Days Matrix */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
                      {calendarDays.map((cell) => {
                        if (cell.empty) {
                          return (
                            <div
                              key={cell.key}
                              className="min-h-24 sm:min-h-28 bg-surface-muted/20 p-1.5"
                            />
                          )
                        }

                        const hasEvents = cell.events && cell.events.length > 0
                        const isSelected =
                          selectedDayNumber === cell.dayNumber ||
                          (!selectedDayNumber && activeDaySchedule?.dayNumber === cell.dayNumber)

                        const visibleEvents = cell.events.slice(0, 2)
                        const remainingCount = cell.events.length - visibleEvents.length

                        return (
                          <div
                            key={cell.key}
                            onClick={() => setSelectedDayNumber(cell.dayNumber)}
                            className={cn(
                              'min-h-24 sm:min-h-28 p-1.5 transition flex flex-col justify-between cursor-pointer select-none',
                              cell.isToday && 'bg-amber-500/5',
                              isSelected
                                ? 'ring-2 ring-inset ring-accent bg-accent-soft/20'
                                : 'hover:bg-surface-muted/40'
                            )}
                          >
                            <div>
                              {/* Day Number Header */}
                              <div className="flex items-center justify-between pb-1">
                                <span
                                  className={cn(
                                    'inline-flex size-6 items-center justify-center rounded-full text-xs font-bold',
                                    cell.isToday
                                      ? 'bg-accent text-white'
                                      : isSelected
                                      ? 'bg-accent/20 text-accent-text'
                                      : 'text-text'
                                  )}
                                >
                                  {cell.dayNumber}
                                </span>

                                {hasEvents ? (
                                  <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[0.62rem] font-bold text-rose-700">
                                    {cell.events.length} booked
                                  </span>
                                ) : (
                                  <span className="text-[0.62rem] font-medium text-emerald-600/80">
                                    Free
                                  </span>
                                )}
                              </div>

                              {/* Event Chips List (Max 2 displayed, remainder indicated) */}
                              <div className="space-y-1">
                                {visibleEvents.map((ev) => (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenBooking(ev.booking_id)
                                    }}
                                    className="w-full text-left rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 text-[0.68rem] text-text transition truncate block cursor-pointer"
                                    title={`Bill #${ev.bill_no} — ${ev.customer_name} (${ev.product_name})`}
                                  >
                                    <span className="font-bold text-accent-text">#{ev.bill_no}</span>{' '}
                                    <span className="font-medium truncate">{ev.product_name}</span>
                                  </button>
                                ))}

                                {remainingCount > 0 && (
                                  <span className="inline-block w-full text-center rounded bg-surface-muted text-[0.62rem] font-bold text-text-secondary py-0.5">
                                    +{remainingCount} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Day Focus Details Panel (clean, legible cards for selected date across Mobile, Tablet, Laptop, Desktop) */}
              {activeDaySchedule && (
                <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-8 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                        <i className="fa-solid fa-calendar-day text-xs" />
                      </span>
                      <div>
                        <h3 className="m-0 text-sm font-bold text-text">
                          {activeDaySchedule.dateObj.toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {activeDaySchedule.events.length > 0
                            ? `${activeDaySchedule.events.length} item reservation(s) scheduled on this day`
                            : 'No reservations booked for this day'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                      {activeDaySchedule.events.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-700">
                          <i className="fa-solid fa-clock text-[0.7rem]" />
                          {activeDaySchedule.events.length} Booked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700">
                          <i className="fa-solid fa-circle-check text-[0.7rem]" />
                          Available for Rent
                        </span>
                      )}
                    </div>
                  </div>

                  {activeDaySchedule.events.length === 0 ? (
                    <div className="py-6 text-center text-text-muted">
                      <i className="fa-solid fa-calendar-check text-2xl text-emerald-600 mb-2" />
                      <p className="text-xs font-semibold text-text">All rental items are free on this date</p>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(activeDaySchedule.dateObj)
                          d.setHours(9, 0, 0, 0)
                          const ret = new Date(d)
                          ret.setDate(ret.getDate() + 3)
                          ret.setHours(21, 0, 0, 0)
                          setPickupDate(toLocalDatetimeInput(d))
                          setReturnDate(toLocalDatetimeInput(ret))
                          setActiveTab('availability')
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text shadow-xs hover:bg-surface-muted transition cursor-pointer"
                      >
                        <i className="fa-solid fa-magnifying-glass" />
                        Check Available Items for this Date
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {activeDaySchedule.events.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-xl border border-border bg-surface-muted/30 p-3.5 flex flex-col justify-between hover:border-accent/40 transition shadow-xs"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-text">
                                #{ev.bill_no}
                              </span>
                              <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-rose-700 capitalize">
                                {ev.status || 'Booked'}
                              </span>
                            </div>

                            <div className="mt-2.5">
                              <h4 className="font-bold text-xs sm:text-sm text-text line-clamp-1" title={ev.product_name}>
                                {ev.product_name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 text-[0.72rem] text-text-muted mt-0.5">
                                {ev.product_code && (
                                  <span className="font-mono font-semibold text-text-secondary">
                                    #{ev.product_code}
                                  </span>
                                )}
                                {ev.size && <span>· Size: <strong className="text-text">{ev.size}</strong></span>}
                                {ev.category && <span>· {ev.category}</span>}
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-border/60 text-[0.72rem] space-y-1">
                              <div className="flex items-center justify-between text-text-secondary">
                                <span className="text-text-muted">Customer:</span>
                                <span className="font-semibold text-text">{ev.customer_name}</span>
                              </div>
                              {ev.customer_phone && (
                                <div className="flex items-center justify-between text-text-secondary">
                                  <span className="text-text-muted">Phone:</span>
                                  <span className="font-mono">{ev.customer_phone}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-text-secondary pt-0.5">
                                <span className="text-text-muted">Schedule:</span>
                                <span className="font-mono text-[0.68rem] text-accent-text font-bold">
                                  {formatDateDisplay(ev.start_date)} &rarr; {formatDateDisplay(ev.end_date)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3.5 pt-2 border-t border-border/60 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenBooking(ev.booking_id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-text shadow-xs hover:bg-surface-muted transition cursor-pointer"
                            >
                              <i className="fa-solid fa-eye text-text-muted" />
                              View Booking
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: AGENDA / SCHEDULE LIST VIEW */}
          {calendarView === 'agenda' && (
            <div className="space-y-4">
              {loadingCalendar ? (
                <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-border bg-white p-8">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl text-accent" />
                    <span className="text-xs font-medium">Loading rental schedule...</span>
                  </div>
                </div>
              ) : agendaGroups.length === 0 ? (
                <div className="flex min-h-[25vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                  <i className="fa-solid fa-calendar-xmark text-3xl text-text-muted mb-2" />
                  <h3 className="font-bold text-sm text-text">No Bookings Found</h3>
                  <p className="text-xs text-text-muted max-w-sm mt-0.5">
                    There are no rental bookings scheduled for {monthYearLabel}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {agendaGroups.map((group) => (
                    <div
                      key={group.dayNumber}
                      className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-accent text-white text-xs font-bold">
                            {group.dayNumber}
                          </span>
                          <h3 className="m-0 font-bold text-xs sm:text-sm text-text">
                            {group.dateObj.toLocaleDateString('en-IN', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </h3>
                        </div>
                        <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[0.68rem] font-bold text-rose-700">
                          {group.events.length} booking(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.events.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded-xl border border-border bg-surface-muted/30 p-3 flex flex-col justify-between hover:border-accent/40 transition shadow-xs"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-text">
                                  #{ev.bill_no}
                                </span>
                                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-rose-700 capitalize">
                                  {ev.status || 'Booked'}
                                </span>
                              </div>

                              <div className="mt-2">
                                <h4 className="font-bold text-xs sm:text-sm text-text line-clamp-1" title={ev.product_name}>
                                  {ev.product_name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 text-[0.72rem] text-text-muted mt-0.5">
                                  {ev.product_code && (
                                    <span className="font-mono font-semibold text-text-secondary">
                                      #{ev.product_code}
                                    </span>
                                  )}
                                  {ev.size && <span>· Size: <strong className="text-text">{ev.size}</strong></span>}
                                  {ev.category && <span>· {ev.category}</span>}
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-border/60 text-[0.72rem] space-y-1">
                                <div className="flex items-center justify-between text-text-secondary">
                                  <span className="text-text-muted">Customer:</span>
                                  <span className="font-semibold text-text">{ev.customer_name}</span>
                                </div>
                                {ev.customer_phone && (
                                  <div className="flex items-center justify-between text-text-secondary">
                                    <span className="text-text-muted">Phone:</span>
                                    <span className="font-mono">{ev.customer_phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-text-secondary pt-0.5">
                                  <span className="text-text-muted">Schedule:</span>
                                  <span className="font-mono text-[0.68rem] text-accent-text font-bold">
                                    {formatDateDisplay(ev.start_date)} &rarr; {formatDateDisplay(ev.end_date)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border/60 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenBooking(ev.booking_id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-text shadow-xs hover:bg-surface-muted transition cursor-pointer"
                              >
                                <i className="fa-solid fa-eye text-text-muted" />
                                View Booking
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking Details Dialog (opened when clicking calendar event) */}
      {viewingBooking && (
        <BookingInfoDialog
          booking={viewingBooking}
          open={Boolean(viewingBooking)}
          onClose={() => setViewingBooking(null)}
          onEdit={(b) => {
            setViewingBooking(null)
            navigate(path(`/booking/${b.id}/edit`))
          }}
        />
      )}
    </div>
  )
}


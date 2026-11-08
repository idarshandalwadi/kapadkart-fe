import BookingActions from './BookingActions'
import {
  BOOKING_TABLE_COLUMNS,
  getBookingLifecycleState,
} from '@/features/bookings/constants/bookings'
import { isColumnVisible } from '@/shared/hooks/useColumnVisibility'
import { formatDateDisplay, formatDateTimeTooltip } from '@/shared/utils/dateFormat'
import { displayValue, hasDisplayValue } from '@/shared/utils/displayValue'

function formatCurrency(value) {
  if (!hasDisplayValue(value) && value !== 0 && value !== '0') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return displayValue(value)
  return `₹${amount.toLocaleString('en-IN')}`
}

function BookingTable({
  bookings,
  onPrintBill,
  onSend,
  onProcessReturn,
  onDelete,
  onViewProduct,
  onViewBooking,
  printingId,
  deletingId,
  visibleColumns,
}) {
  const show = (key) => isColumnVisible(visibleColumns, key)
  const visibleCount = BOOKING_TABLE_COLUMNS.filter((column) => show(column.key)).length
  const minWidth = Math.max(640, visibleCount * 108 + 140)

  return (
    <div className="data-table-wrap">
      <table
        className="data-table min-w-[var(--table-min-width)] max-[767px]:!min-w-0"
        style={{ '--table-min-width': `${minWidth}px` }}
      >
        <thead>
          <tr>
            {show('bill_no') && <th>Bill No</th>}
            {show('booking_date') && <th>Booking Date</th>}
            {show('customer') && <th>Customer</th>}
            {show('phone') && <th>Phone</th>}
            {show('address') && <th>Address</th>}
            {(show('pickup_date') || show('order_date')) && <th>Pickup Date</th>}
            {show('return_date') && <th>Return Date</th>}
            {show('products') && <th>Products</th>}
            {show('status') && <th>Status</th>}
            {show('total') && <th>Total</th>}
            {show('paid') && <th>Paid(Jama)</th>}
            {show('due') && <th>Due(Baki)</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const lifecycle = getBookingLifecycleState(booking)
            const isOverdue = booking.is_overdue || lifecycle === 'OVERDUE'
            const items = Array.isArray(booking.items) ? booking.items : []

            return (
              <tr
                key={booking.id}
                className={isOverdue ? 'bg-rose-950/10 hover:bg-rose-950/20' : ''}
              >
                {show('bill_no') && (
                  <td data-label="Bill No" className="font-bold whitespace-nowrap text-text">
                    <div className="flex items-center gap-1.5">
                      {onViewBooking ? (
                        <button
                          type="button"
                          className="cursor-pointer border-0 bg-transparent p-0 font-bold text-accent hover:text-accent-hover hover:underline transition-colors"
                          onClick={() => onViewBooking(booking)}
                          title="View booking details"
                        >
                          {displayValue(booking.bill_no)}
                        </button>
                      ) : (
                        <span>{displayValue(booking.bill_no)}</span>
                      )}
                      {isOverdue && (
                        <span className="size-2 rounded-full bg-rose-500 animate-ping" title="Overdue" />
                      )}
                    </div>
                  </td>
                )}
                {show('booking_date') && (
                  <td
                    data-label="Booking Date"
                    className="whitespace-nowrap text-text-muted"
                    title={formatDateTimeTooltip(booking.created_at)}
                  >
                    {formatDateDisplay(booking.created_at)}
                  </td>
                )}
                {show('customer') && (
                  <td data-label="Customer" className="min-w-[120px] font-semibold">
                    {displayValue(booking.customer_name)}
                  </td>
                )}
                {show('phone') && (
                  <td data-label="Phone">
                    <div>{displayValue(booking.phone_number)}</div>
                    {hasDisplayValue(booking.extra_phone_number) && (
                      <div className="mt-[0.15rem] text-[0.8rem] text-text-muted">
                        {displayValue(booking.extra_phone_number)}
                      </div>
                    )}
                  </td>
                )}
                {show('address') && (
                  <td data-label="Address">{displayValue(booking.village_address)}</td>
                )}
                {(show('pickup_date') || show('order_date')) && (
                  <td
                    data-label="Pickup Date"
                    className="whitespace-nowrap"
                    title={formatDateTimeTooltip(booking.pickup_date || booking.use_date)}
                  >
                    {formatDateDisplay(booking.pickup_date || booking.use_date)}
                  </td>
                )}
                {show('return_date') && (
                  <td
                    data-label="Return Date"
                    className="whitespace-nowrap"
                    title={formatDateTimeTooltip(booking.return_date)}
                  >
                    <div className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                      {formatDateDisplay(booking.return_date)}
                      {isOverdue && (
                        <div className="text-[0.7rem] text-rose-400">
                          ({booking.overdue_days}d overdue)
                        </div>
                      )}
                    </div>
                  </td>
                )}
                {show('products') && (
                  <td data-label="Products" className="max-w-[220px] leading-[1.4] whitespace-pre-wrap">
                    {items.length > 0 ? (
                      <div className="flex flex-col gap-[0.25rem]">
                        {items.map((item, i) => (
                          <button
                            key={item.id || i}
                            type="button"
                            className="block cursor-pointer border-0 bg-transparent p-0 text-left hover:underline group"
                            onClick={() => onViewProduct?.(item.product_id)}
                          >
                            <span className="block font-medium text-accent group-hover:text-accent-hover transition-colors">
                              {item.product?.product_name || 'Item'} {item.product?.product_code && `(${item.product.product_code})`} × {item.quantity}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                {show('status') && (
                  <td data-label="Status">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        lifecycle === 'OVERDUE'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 animate-pulse'
                          : lifecycle === 'RETURNED'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                            : lifecycle === 'ACTIVE'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                              : lifecycle === 'PICKUP_DUE'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25'
                                : lifecycle === 'PARTIALLY_RETURNED'
                                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/25'
                                  : 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/25'
                      }`}
                    >
                      {lifecycle === 'PICKUP_DUE'
                        ? 'Ready for Pickup'
                        : lifecycle === 'ACTIVE'
                          ? 'Dispatched'
                          : lifecycle === 'RESERVED'
                            ? 'Reserved'
                            : lifecycle}
                    </span>
                  </td>
                )}
                {show('total') && (
                  <td data-label="Rental">{formatCurrency(booking.rental_total)}</td>
                )}
                {show('paid') && (
                  <td data-label="Paid">{formatCurrency(booking.paid_amount)}</td>
                )}
                {show('due') && (
                  <td data-label="Due" className="font-bold text-warning-text">
                    {formatCurrency(booking.due_amount)}
                  </td>
                )}
                <td data-label="Actions">
                  <BookingActions
                    booking={booking}
                    onPrintBill={onPrintBill}
                    onSend={onSend}
                    onProcessReturn={onProcessReturn}
                    onDelete={onDelete}
                    onViewBooking={onViewBooking}
                    printing={printingId === booking.id}
                    deleting={deletingId === booking.id}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default BookingTable

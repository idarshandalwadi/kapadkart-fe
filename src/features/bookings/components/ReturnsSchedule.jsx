import React, { useEffect, useState } from 'react'
import { fetchReturnsSchedule } from '../api/bookings'
import ReturnBookingDialog from './ReturnBookingDialog'

export default function ReturnsSchedule({ onRefreshData }) {
  const [tab, setTab] = useState('today')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState(null)

  const loadSchedule = () => {
    setLoading(true)
    fetchReturnsSchedule({ tab, limit: 30 })
      .then((res) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : []
        setData(list)
      })
      .catch((err) => {
        console.error('Failed to fetch returns schedule:', err)
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadSchedule()
  }, [tab])

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-text flex items-center gap-2 m-0">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-calendar-check text-base" />
            </span>
            Rental Returns Schedule
          </h3>
          <p className="text-xs text-text-secondary mt-1 mb-0">
            Track and process rental returns with real-time overdue alerts & item check-in
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <i className="fa-solid fa-triangle-exclamation text-[0.7rem]" />
            <span>Overdue</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tab === 'today'
                ? 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-slate-950 font-bold shadow-xs'
                : 'text-text-secondary hover:text-text hover:bg-white'
            }`}
          >
            Due Today
          </button>
          <button
            type="button"
            onClick={() => setTab('tomorrow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tab === 'tomorrow'
                ? 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-slate-950 font-bold shadow-xs'
                : 'text-text-secondary hover:text-text hover:bg-white'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tab === 'upcoming'
                ? 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-slate-950 font-bold shadow-xs'
                : 'text-text-secondary hover:text-text hover:bg-white'
            }`}
          >
            Next 7 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-secondary animate-pulse">Loading schedule...</div>
      ) : data.length === 0 ? (
        <div className="empty-state flex items-center justify-center gap-3">
          <i className="fa-solid fa-calendar-xmark text-2xl text-text-muted shrink-0" />
          <span>
            No {tab === 'today' ? 'returns due today' : tab === 'tomorrow' ? 'returns due tomorrow' : tab === 'overdue' ? 'overdue returns' : 'upcoming returns in the next 7 days'}.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Array.isArray(data) ? data : []).map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                b.is_overdue
                  ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50 shadow-xs'
                  : 'bg-surface border-border hover:border-accent/40 shadow-xs'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-text bg-surface-muted px-2 py-0.5 rounded border border-border shrink-0">
                      #{b.bill_no}
                    </span>
                    <span className="font-semibold text-text text-sm truncate">{b.customer_name}</span>
                  </div>

                  {b.is_overdue ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-700 border border-rose-500/25 shrink-0 animate-pulse">
                      {b.overdue_days} {b.overdue_days === 1 ? 'day' : 'days'} overdue
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-700 border border-amber-500/25 shrink-0">
                      Due {new Date(b.return_date).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="text-xs text-text-secondary flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-phone text-[0.7rem] text-text-muted" />
                    <span>{b.phone_number}</span>
                    {b.phone_number && (
                      <a
                        href={`tel:${b.phone_number}`}
                        className="ml-1 text-[0.7rem] px-1.5 py-0.5 rounded bg-surface-muted hover:bg-accent-soft text-text-secondary hover:text-accent-text no-underline transition"
                        title="Call customer"
                      >
                        <i className="fa-solid fa-phone-flip text-[0.65rem] mr-1" />
                        Call
                      </a>
                    )}
                  </div>
                  <span><strong className="text-text">{b.items?.length || 0}</strong> products</span>
                </div>

                {b.items && b.items.length > 0 && (
                  <div className="text-xs text-text-secondary bg-surface-muted/60 p-2.5 rounded-lg border border-border space-y-1.5 max-h-32 overflow-y-auto">
                    {b.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-[0.78rem]">
                        <span className="truncate pr-2 font-medium text-text">{it.product?.product_name || 'Item'} ({it.quantity} qty)</span>
                        <span className="shrink-0 font-semibold">
                          {it.returned_quantity >= it.quantity ? (
                            <span className="text-emerald-600">Returned</span>
                          ) : (
                            <span className="text-amber-600">Pending: {it.quantity - (it.returned_quantity || 0)}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="text-xs text-text-secondary">
                  Total: <strong className="text-text">₹{b.rental_total}</strong> | Due: <strong className={Number(b.due_amount) > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>₹{b.due_amount}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBookingForReturn(b)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_55%,#d97706_100%)] hover:brightness-[1.03] rounded-[9px] transition shadow-[0_4px_12px_rgba(217,119,6,0.2)] flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-box-open text-[0.75rem]" />
                  Process Return
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBookingForReturn && (
        <ReturnBookingDialog
          booking={selectedBookingForReturn}
          onClose={() => setSelectedBookingForReturn(null)}
          onSuccess={() => {
            loadSchedule()
            if (onRefreshData) onRefreshData()
          }}
        />
      )}
    </div>
  )
}

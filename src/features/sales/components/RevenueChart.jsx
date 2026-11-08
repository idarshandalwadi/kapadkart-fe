import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatCurrency(value) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload || {}
  const paidVal = Number(row.paidAmount ?? row.amount ?? 0)
  const dueVal = Number(row.dueAmount ?? 0)
  const totalVal = Number(row.totalAmount ?? (paidVal + dueVal))
  const count = row.bookings ?? row.sales

  return (
    <div className="rounded-xl border border-border bg-ink p-3 text-xs text-white shadow-xl min-w-[170px]">
      <div className="flex items-center justify-between border-b border-white/15 pb-2 mb-2">
        <span className="font-semibold text-ink-muted">{label}</span>
        {count != null && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.7rem] text-ink-muted">
            {count} {row.bookings != null ? 'booking' : 'sale'}{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
            Paid Received:
          </span>
          <strong className="font-bold text-white">{formatCurrency(paidVal)}</strong>
        </div>

        {dueVal > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="size-2 rounded-full bg-amber-400 inline-block" />
              Due Pending:
            </span>
            <strong className="font-bold text-amber-300">{formatCurrency(dueVal)}</strong>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-1.5 mt-0.5 text-white/90">
          <span className="text-white/70">Total Value:</span>
          <strong className="font-bold font-mono">{formatCurrency(totalVal)}</strong>
        </div>
      </div>
    </div>
  )
}

function RevenueChart({ chart }) {
  if (!chart?.days?.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border-strong bg-white/65 text-text-secondary">
        No chart data available
      </div>
    )
  }

  const data = chart.days.map((day) => {
    const paid = Number(day.paidAmount ?? day.amount) || 0
    const due = Number(day.dueAmount) || 0
    const total = Number(day.totalAmount ?? (paid + due)) || 0
    return {
      label: day.label,
      paidAmount: paid,
      dueAmount: due,
      totalAmount: total,
      amount: paid,
      bookings: day.bookings,
      sales: day.sales,
    }
  })

  const totalPeriodPaid = data.reduce((sum, d) => sum + d.paidAmount, 0)
  const totalPeriodDue = data.reduce((sum, d) => sum + d.dueAmount, 0)
  const hasDueData = data.some((d) => d.dueAmount > 0)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-[1.35rem] shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[1.2rem] font-semibold tracking-[-0.02em] text-text">
            {chart.title}
          </h2>
          <p className="m-0 mt-[0.3rem] text-[0.85rem] text-text-secondary">{chart.subtitle}</p>
        </div>

        {/* Legend / Period totals pill badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Paid: {formatCurrency(totalPeriodPaid)}</span>
          </div>

          {hasDueData && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-50/70 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Due: {formatCurrency(totalPeriodDue)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-[280px] flex-1">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="dueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8dbe0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#5c636b' }}
              axisLine={{ stroke: '#d8dbe0' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `₹${v}`}
              tick={{ fontSize: 12, fill: '#5c636b' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="paidAmount"
              name="Paid Amount"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#paidGradient)"
              activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
            />
            {hasDueData && (
              <Area
                type="monotone"
                dataKey="dueAmount"
                name="Due Amount"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#dueGradient)"
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default RevenueChart


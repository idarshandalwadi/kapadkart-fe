import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label, singular, plural }) {
  if (!active || !payload?.length) return null

  const count = Number(payload[0].value) || 0

  return (
    <div className="rounded-md bg-ink px-[0.8rem] py-[0.55rem] text-[0.85rem] text-white shadow-md">
      <p className="m-0 mb-[0.15rem] text-ink-muted">{label}</p>
      <p className="m-0 font-bold">
        {count} {count === 1 ? singular : plural}
      </p>
    </div>
  )
}

function DailyCountChart({
  chart,
  valueKey,
  singular,
  plural,
  barColor = '#d97706',
  cursorFill = 'rgba(217, 119, 6, 0.08)',
  emptyMessage = 'No chart data available',
}) {
  if (!chart?.days?.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border-strong bg-white/65 text-text-secondary">
        {emptyMessage}
      </div>
    )
  }

  const data = chart.days.map((day) => ({
    label: day.label,
    [valueKey]: Number(day[valueKey]) || 0,
  }))

  const total = data.reduce((sum, day) => sum + (Number(day[valueKey]) || 0), 0)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-[1.35rem] shadow-md">
      <div>
        <h2 className="m-0 font-display text-[1.2rem] font-semibold tracking-[-0.02em] text-text">
          {chart.title}
        </h2>
        <p className="m-0 mt-[0.3rem] text-[0.85rem] text-text-secondary">
          {chart.subtitle}
          {total > 0 ? ` · ${total} total` : ''}
        </p>
      </div>
      <div className="mt-4 min-h-[280px] flex-1">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8dbe0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#5c636b' }}
              axisLine={{ stroke: '#d8dbe0' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#5c636b' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              content={
                <ChartTooltip singular={singular} plural={plural} />
              }
              cursor={{ fill: cursorFill }}
            />
            <Bar
              dataKey={valueKey}
              fill={barColor}
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DailyCountChart

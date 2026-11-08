import DailyCountChart from '@/features/sales/components/DailyCountChart'

function SalesChart({ chart }) {
  return (
    <DailyCountChart
      chart={chart}
      valueKey="sales"
      singular="sale"
      plural="sales"
      barColor="#2563eb"
      cursorFill="rgba(37, 99, 235, 0.1)"
      emptyMessage="No sell report data available"
    />
  )
}

export default SalesChart

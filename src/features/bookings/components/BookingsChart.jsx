import DailyCountChart from '@/features/sales/components/DailyCountChart'

function BookingsChart({ chart }) {
  return (
    <DailyCountChart
      chart={chart}
      valueKey="bookings"
      singular="booking"
      plural="bookings"
      barColor="#d97706"
      cursorFill="rgba(217, 119, 6, 0.08)"
      emptyMessage="No booking chart data available"
    />
  )
}

export default BookingsChart

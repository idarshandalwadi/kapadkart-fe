import Skeleton from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

/**
 * Individual KPI Metric Card Skeleton
 */
export function DashboardKpiSkeletonItem({ className }) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Metric Label */}
        <Skeleton className="h-4 w-28" />
        {/* Metric Icon Box */}
        <Skeleton variant="circular" className="h-10 w-10 rounded-xl" />
      </div>

      {/* Main KPI Value */}
      <div className="my-1">
        <Skeleton className="h-8 w-36 mb-2" />
      </div>

      {/* Footer Trend / Subtext */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

/**
 * Row / Grid of Dashboard KPI Skeletons
 *
 * @param {Object} props
 * @param {number} [props.count=4] - Number of KPI cards to display
 * @param {string} [props.className] - Container grid classes
 */
export default function DashboardKpiSkeleton({ count = 4, className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <DashboardKpiSkeletonItem key={index} />
      ))}
    </div>
  )
}

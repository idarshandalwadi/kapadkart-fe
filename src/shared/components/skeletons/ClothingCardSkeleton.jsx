import Skeleton from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

/**
 * Individual Clothing Card Skeleton
 */
export function ClothingCardSkeletonItem({ className }) {
  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm',
        className
      )}
    >
      {/* 3:4 Aspect Ratio Product Image Box */}
      <Skeleton
        variant="rounded"
        className="w-full aspect-[3/4] rounded-xl mb-3"
      />

      {/* Category & Status Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>

      {/* Product Title (2 lines) */}
      <Skeleton className="h-4 w-4/5 mb-1.5" />
      <Skeleton className="h-3 w-1/2 mb-3" />

      {/* Price / Day & Action Row */}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="space-y-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * Grid of Clothing Card Skeletons
 *
 * @param {Object} props
 * @param {number} [props.count=8] - Number of skeleton cards to display
 * @param {string} [props.className] - Grid container class override
 */
export default function ClothingCardSkeleton({ count = 8, className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ClothingCardSkeletonItem key={index} />
      ))}
    </div>
  )
}

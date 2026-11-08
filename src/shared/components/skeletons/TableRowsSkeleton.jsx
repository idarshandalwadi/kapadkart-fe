import Skeleton from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

/**
 * Skeleton rows for standard HTML/Tailwind table bodies
 *
 * @param {Object} props
 * @param {number} [props.rows=5] - Number of skeleton rows
 * @param {number} [props.cols=6] - Number of skeleton columns per row
 * @param {string} [props.rowClassName] - Class names for each <tr>
 * @param {string} [props.cellClassName] - Class names for each <td>
 */
export function TableRowsSkeleton({
  rows = 5,
  cols = 6,
  rowClassName,
  cellClassName,
}) {
  // Varied widths for realistic cell rendering
  const getWidth = (colIdx) => {
    switch (colIdx % 6) {
      case 0: return 'w-16'  // ID / SKU / Bill #
      case 1: return 'w-36'  // Customer Name / Title
      case 2: return 'w-24'  // Date / Phone
      case 3: return 'w-20'  // Amount / Price
      case 4: return 'w-20'  // Status Badge
      case 5: return 'w-14'  // Actions
      default: return 'w-24'
    }
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr
          key={rIdx}
          className={cn('border-b border-slate-100 transition-colors', rowClassName)}
        >
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className={cn('p-3.5 align-middle', cellClassName)}>
              {cIdx === 4 ? (
                // Badge placeholder
                <Skeleton className={cn('h-6 rounded-full', getWidth(cIdx))} />
              ) : cIdx === cols - 1 ? (
                // Action buttons placeholder
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" className="h-7 w-7 rounded-lg" />
                  <Skeleton variant="circular" className="h-7 w-7 rounded-lg" />
                </div>
              ) : (
                // Text placeholder
                <Skeleton className={cn('h-4', getWidth(cIdx))} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Full Table Skeleton wrapper including header placeholder and search bar
 */
export function TableCardSkeleton({
  rows = 5,
  cols = 6,
  className,
  showToolbar = true,
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm',
        className
      )}
    >
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-xs text-slate-500 uppercase">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="p-3.5">
                  <Skeleton className="h-3.5 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRowsSkeleton rows={rows} cols={cols} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableRowsSkeleton

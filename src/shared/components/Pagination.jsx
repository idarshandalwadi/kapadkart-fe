import { cn } from '@/shared/utils/cn'

export function Pagination({
  pagination,
  page: propPage,
  totalPages: propTotalPages,
  total: propTotal,
  onPageChange,
  loading = false,
  className,
  showTotal = false,
}) {
  const page = Number(pagination?.page ?? propPage ?? 1)
  const totalPages = Number(
    pagination?.totalPages ??
      pagination?.total_pages ??
      propTotalPages ??
      (propTotal && pagination?.limit ? Math.ceil(propTotal / pagination.limit) : 1),
  )
  const total = pagination?.total ?? propTotal

  if (!totalPages || totalPages <= 1) return null

  const softBtnClass =
    'rounded-[9px] border border-border bg-white font-semibold text-text cursor-pointer transition-[background-color,border-color,color] duration-160 enabled:hover:bg-accent-soft enabled:hover:border-[#f0d19a] enabled:hover:text-accent-text disabled:opacity-45 disabled:cursor-not-allowed select-none'

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-center gap-3 py-[0.35rem]', className)}
      aria-label="Pagination"
    >
      <button
        type="button"
        className={cn(softBtnClass, 'px-[1.05rem] py-[0.55rem] text-[0.9rem]')}
        disabled={page <= 1 || loading}
        onClick={() => onPageChange?.(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <span className="text-[0.9rem] font-medium text-text-secondary">
        Page {page} of {totalPages}
        {showTotal && total != null ? ` (${total} ${total === 1 ? 'item' : 'items'})` : ''}
      </span>
      <button
        type="button"
        className={cn(softBtnClass, 'px-[1.05rem] py-[0.55rem] text-[0.9rem]')}
        disabled={page >= totalPages || loading}
        onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
      >
        Next
      </button>
    </nav>
  )
}

export default Pagination

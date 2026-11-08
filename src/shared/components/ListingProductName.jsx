import { cn } from '@/shared/utils/cn'
import { displayValue, truncateListingText } from '@/shared/utils/displayValue'

/**
 * Compact product name for listings:
 * wraps after ~20–25 letters, shows at most 40 letters, then an ellipsis.
 * Hover shows the full name.
 */
function ListingProductName({ name, fallback = '—', className }) {
  const full = displayValue(name, fallback)
  const short = truncateListingText(name, undefined, fallback)

  return (
    <span
      className={cn(
        'inline-block max-w-[24ch] min-w-0 break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug max-[767px]:max-w-full',
        className,
      )}
      title={short !== full ? full : undefined}
    >
      {short}
    </span>
  )
}

export default ListingProductName

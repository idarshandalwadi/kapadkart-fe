import { cn } from '@/shared/utils/cn'

/**
 * Base Skeleton placeholder component.
 *
 * @param {Object} props
 * @param {string} [props.className] - Additional Tailwind classes
 * @param {'text' | 'circular' | 'rectangular' | 'image' | 'rounded'} [props.variant='text'] - Shape of the skeleton
 * @param {string|number} [props.width] - Optional inline or style width
 * @param {string|number} [props.height] - Optional inline or style height
 * @param {boolean} [props.shimmer=true] - Whether to apply high-sheen shimmer effect
 */
export default function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  shimmer = true,
  style,
  ...props
}) {
  const variantClasses = {
    text: 'h-4 w-full rounded-md',
    circular: 'rounded-full shrink-0',
    rectangular: 'rounded-none w-full',
    rounded: 'rounded-xl w-full',
    image: 'rounded-2xl w-full aspect-[3/4]',
  }

  const customStyle = {
    ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style,
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden bg-slate-200/80',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent',
        variantClasses[variant] || variantClasses.text,
        className
      )}
      style={customStyle}
      {...props}
    />
  )
}

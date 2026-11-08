import { useState } from 'react'
import Skeleton from './Skeleton'
import { cn } from '@/shared/utils/cn'

/**
 * Image wrapper with built-in shimmer placeholder and smooth fade-in transition.
 *
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Image alt text
 * @param {string} [props.className] - Class names for the image element
 * @param {string} [props.containerClassName] - Class names for the outer container
 * @param {'image'|'rounded'|'rectangular'|'circular'} [props.skeletonVariant='image']
 * @param {string|number} [props.aspectRatio] - CSS aspect ratio (default: '3/4')
 * @param {React.ReactNode} [props.fallback] - Custom fallback icon/component on error
 */
export default function SkeletonImage({
  src,
  alt = '',
  className,
  containerClassName,
  skeletonVariant = 'image',
  aspectRatio = '3/4',
  fallback,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setIsLoaded(true)
    setHasError(true)
  }

  return (
    <div
      className={cn('relative overflow-hidden bg-slate-100/80', containerClassName)}
      style={{ aspectRatio }}
    >
      {/* Skeleton Shimmer Overlay */}
      {!isLoaded && (
        <Skeleton
          variant={skeletonVariant}
          className="absolute inset-0 h-full w-full rounded-none"
        />
      )}

      {/* Actual Image */}
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300 ease-out',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      ) : hasError || !src ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
          {fallback || (
            <>
              <i className="fa-solid fa-shirt text-2xl mb-1 text-slate-300" aria-hidden="true" />
              <span className="text-[0.7rem] font-medium">No Image</span>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

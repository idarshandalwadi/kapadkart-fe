import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

const SAMPLE_SIZE = 48

/**
 * Samples average luminance of non-transparent pixels.
 * Returns 'light' | 'dark' | 'unknown' (unknown when canvas is tainted / unloadable).
 */
function detectLogoTone(img) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_SIZE
    canvas.height = SAMPLE_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return 'unknown'

    ctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    let total = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 32) continue
      // Relative luminance (sRGB)
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      total += 0.2126 * r + 0.7152 * g + 0.0722 * b
      count += 1
    }

    if (count < 8) return 'unknown'
    return total / count >= 0.55 ? 'light' : 'dark'
  } catch {
    return 'unknown'
  }
}

/**
 * Renders a tenant logo with an auto-contrasting plate so dark logos
 * stay visible on dark chrome (sidebar) and light logos on light surfaces.
 *
 * @param {'dark' | 'light'} surface — surrounding UI tone
 */
export default function BrandLogo({
  src,
  alt,
  surface = 'dark',
  className,
  imgClassName,
  bordered = false,
}) {
  const [tone, setTone] = useState('unknown')
  const [loadedSrc, setLoadedSrc] = useState(src)

  // Reset when tenant/logo changes so we don't keep the previous plate.
  if (src !== loadedSrc) {
    setLoadedSrc(src)
    setTone('unknown')
  }

  const needsLightPlate =
    bordered && surface === 'dark' && (tone === 'dark' || tone === 'unknown')
  const needsDarkPlate = bordered && surface === 'light' && tone === 'light'

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center justify-center',
        needsLightPlate &&
          'rounded-xl border border-black/6 bg-white p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.08)]',
        needsDarkPlate &&
          'rounded-xl border border-black/10 bg-[#1a1c1e] p-1.5',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn('block max-w-full object-contain', imgClassName)}
        onLoad={(e) => setTone(detectLogoTone(e.currentTarget))}
        onError={() => setTone('unknown')}
      />
    </div>
  )
}

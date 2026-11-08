/**
 * Crop + rotate helper aligned with react-easy-crop's recommended canvas approach.
 * Prefer Blob/File for upload to disk storage; data URLs remain for editor preview only.
 */
export async function getCroppedImageBlob(
  imageSrc,
  croppedAreaPixels,
  rotation = 0,
  {
    mimeType = 'image/jpeg',
    quality = 0.92,
    maxEdge = 1600,
  } = {},
) {
  const image = await loadImage(imageSrc)
  const radian = (rotation * Math.PI) / 180

  const sin = Math.abs(Math.sin(radian))
  const cos = Math.abs(Math.cos(radian))
  const boundingWidth = Math.ceil(image.width * cos + image.height * sin)
  const boundingHeight = Math.ceil(image.width * sin + image.height * cos)

  const canvas = document.createElement('canvas')
  canvas.width = boundingWidth
  canvas.height = boundingHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas context')

  ctx.translate(boundingWidth / 2, boundingHeight / 2)
  ctx.rotate(radian)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const { width: cropW, height: cropH, x: cropX, y: cropY } = croppedAreaPixels

  let outW = Math.round(cropW)
  let outH = Math.round(cropH)
  if (maxEdge && Math.max(outW, outH) > maxEdge) {
    const scale = maxEdge / Math.max(outW, outH)
    outW = Math.round(outW * scale)
    outH = Math.round(outH * scale)
  }

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = outW
  croppedCanvas.height = outH
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) throw new Error('Could not create crop canvas')

  // White background so JPEG/WebP don't turn transparent areas black.
  if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
    croppedCtx.fillStyle = '#ffffff'
    croppedCtx.fillRect(0, 0, outW, outH)
  }

  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

  return canvasToBlob(croppedCanvas, mimeType, quality)
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode image'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

/**
 * Downscale any-size source file so the cropper can open large camera photos
 * without loading tens of megabytes into memory. The original file is not
 * uploaded; compression to the upload cap happens after crop.
 */
export async function prepareImageForEditor(file, { maxEdge = 2400 } = {}) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const longest = Math.max(image.width, image.height)

    if (longest <= maxEdge) {
      return {
        src: objectUrl,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      }
    }

    const scale = maxEdge / longest
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create canvas context')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
    URL.revokeObjectURL(objectUrl)
    const src = URL.createObjectURL(blob)
    return {
      src,
      cleanup: () => URL.revokeObjectURL(src),
    }
  } catch (err) {
    URL.revokeObjectURL(objectUrl)
    throw err
  }
}

/**
 * Crop then compress until the blob is under `maxBytes`.
 * Prefer JPEG/WebP — PNG is lossless and ignores quality, so it often stays too large.
 */
export async function getCompressedCroppedImageBlob(
  imageSrc,
  croppedAreaPixels,
  rotation = 0,
  {
    mimeType = 'image/jpeg',
    maxEdge = 800,
    maxBytes = 500 * 1024,
    initialQuality = 0.85,
    minQuality = 0.55,
    minEdge = 400,
  } = {},
) {
  let quality = initialQuality
  let edge = maxEdge
  let outputMime = mimeType

  const encode = () =>
    getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, {
      mimeType: outputMime,
      quality,
      maxEdge: edge,
    })

  let blob = await encode()

  // PNG can't shrink via quality; convert to JPEG when still too large.
  if (blob.size > maxBytes && outputMime === 'image/png') {
    outputMime = 'image/jpeg'
    blob = await encode()
  }

  while (blob.size > maxBytes && (quality > minQuality + 0.01 || edge > minEdge)) {
    if (quality > minQuality + 0.01) {
      quality = Math.max(minQuality, Number((quality - 0.1).toFixed(2)))
    } else {
      edge = Math.max(minEdge, Math.round(edge * 0.75))
      quality = initialQuality
    }

    blob = await encode()
  }

  // Last resort: keep shrinking until it fits the upload cap.
  while (blob.size > maxBytes && edge > 160) {
    edge = Math.max(160, Math.round(edge * 0.7))
    quality = Math.min(quality, Math.max(0.4, minQuality))
    blob = await encode()
  }

  if (blob.size > maxBytes) {
    throw new Error(
      `Image is still too large after compression (${Math.ceil(blob.size / 1024)} KB). Try a different photo.`,
    )
  }

  return blob
}

/** @deprecated Prefer getCroppedImageBlob + upload; kept for rare preview-only cases. */
export async function getCroppedImageDataUrl(
  imageSrc,
  croppedAreaPixels,
  rotation = 0,
  options = {},
) {
  const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, options)
  return readBlobAsDataUrl(blob)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Failed to load image')))
    image.src = src
  })
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(new Error('Failed to read file')))
    reader.readAsDataURL(file)
  })
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(new Error('Failed to read blob')))
    reader.readAsDataURL(blob)
  })
}

export function isImageFile(file) {
  return Boolean(file && file.type && file.type.startsWith('image/'))
}

export function extensionForMime(mimeType) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

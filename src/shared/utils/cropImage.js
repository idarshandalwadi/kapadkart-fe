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
    maxEdge = 800,
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

  if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
    croppedCtx.fillStyle = '#ffffff'
    croppedCtx.fillRect(0, 0, outW, outH)
  }

  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
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
 * Crop then compress until the blob is under `maxBytes`.
 * Prefer JPEG/WebP — PNG is lossless and ignores quality, so it often stays too large.
 */
export async function getCompressedCroppedImageBlob(
  imageSrc,
  croppedAreaPixels,
  rotation = 0,
  {
    mimeType = 'image/jpeg',
    maxEdge = 400,
    maxBytes = 400 * 1024,
    initialQuality = 0.85,
    minQuality = 0.55,
    minEdge = 200,
  } = {},
) {
  let quality = initialQuality
  let edge = maxEdge
  let outputMime = mimeType
  let blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, {
    mimeType: outputMime,
    quality,
    maxEdge: edge,
  })

  if (blob.size > maxBytes && outputMime === 'image/png') {
    outputMime = 'image/jpeg'
    blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, {
      mimeType: outputMime,
      quality,
      maxEdge: edge,
    })
  }

  while (blob.size > maxBytes && (quality > minQuality + 0.01 || edge > minEdge)) {
    if (quality > minQuality + 0.01) {
      quality = Math.max(minQuality, Number((quality - 0.1).toFixed(2)))
    } else {
      edge = Math.max(minEdge, Math.round(edge * 0.75))
      quality = initialQuality
    }

    blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, {
      mimeType: outputMime,
      quality,
      maxEdge: edge,
    })
  }

  if (blob.size > maxBytes) {
    throw new Error(
      `Image is still too large after compression (${Math.ceil(blob.size / 1024)} KB). Try a simpler logo.`,
    )
  }

  return blob
}

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

/**
 * Normalize product.image (single string, JSON array string, or array) → string[].
 */
export function parseProductImages(image) {
  if (image == null || image === '') return []

  if (Array.isArray(image)) {
    return image.map((item) => String(item).trim()).filter(Boolean)
  }

  const raw = String(image).trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      // Fall through: treat as a single opaque string.
    }
  }

  return [raw]
}

/**
 * Serialize images for the API `image` TEXT column.
 * One URL stays a plain string (legacy-compatible); multiple become a JSON array string.
 */
export function serializeProductImages(images) {
  const list = parseProductImages(images)
  if (!list.length) return null
  if (list.length === 1) return list[0]
  return JSON.stringify(list)
}

export const MAX_PRODUCT_IMAGES = 2

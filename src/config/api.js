// API configuration using base path or VITE_API_BASE_URL
import { parseProductImages } from '@/features/products/utils/productImages'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? basePath

export const PRODUCT_PLACEHOLDER_IMAGE = `${import.meta.env.BASE_URL}product-placeholder.webp`

function resolveImageSrc(path) {
  if (!path) return ''

  if (/^data:/i.test(path) || /^blob:/i.test(path)) {
    return path
  }

  // Return remote/external product image URLs directly (e.g. S3).
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) {
    return path
  }

  const normalized = path.startsWith('/') ? path : `/${path}`

  // Legacy /images/* placeholders are not used; prefer uploaded /uploads/* paths.
  if (normalized.startsWith('/images/')) {
    return ''
  }

  const base = String(API_BASE_URL).replace(/\/$/, '')
  return `${base}${normalized}`
}

/**
 * All displayable product image URLs (supports multi-image JSON in `image`).
 */
export function getProductImageUrls(product) {
  const urls = parseProductImages(product?.image)
    .map((path) => resolveImageSrc(path))
    .filter(Boolean)
  return urls.length > 0 ? urls : [PRODUCT_PLACEHOLDER_IMAGE]
}

/**
 * Resolve the primary product image for <img src>.
 * Supports: data URLs, blob URLs, API-relative paths (/uploads/...),
 * and a JSON array string of those (uses the first usable entry).
 */
export function getProductImageUrl(product) {
  const urls = getProductImageUrls(product)
  return urls[0] || PRODUCT_PLACEHOLDER_IMAGE
}

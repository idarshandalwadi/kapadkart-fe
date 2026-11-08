import { apiFetch } from '@/shared/api/http'

/**
 * GET /api/brands
 * Supports optional { page, limit }.
 * If page is omitted, returns array of all brands for backward compatibility.
 */
export async function fetchBrands(params) {
  if (params && params.page !== undefined) {
    const sp = new URLSearchParams()
    sp.set('page', String(params.page))
    if (params.limit) sp.set('limit', String(params.limit))
    return apiFetch(`/api/brands?${sp.toString()}`)
  }
  const json = await apiFetch('/api/brands')
  return json.data ?? []
}

/** POST /api/brands */
export async function createBrand(name) {
  return apiFetch('/api/brands', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/**
 * POST /api/brands/bulk
 * Bulk CSV import with template row filtering and deduplication.
 */
export async function bulkImportBrands(items, source = 'csv') {
  return apiFetch('/api/brands/bulk', {
    method: 'POST',
    body: JSON.stringify({ items, source }),
  })
}

/**
 * POST /api/brands/resolve
 * Case-insensitive find-or-create for CSV import.
 */
export async function resolveBrand(name) {
  return apiFetch('/api/brands/resolve', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/** DELETE /api/brands/:id */
export async function deleteBrand(id) {
  return apiFetch(`/api/brands/${id}`, {
    method: 'DELETE',
  })
}

/**
 * GET /api/categories
 * Supports optional { page, limit }.
 * If page is omitted, returns array of all categories for backward compatibility.
 */
export async function fetchCategories(params) {
  if (params && params.page !== undefined) {
    const sp = new URLSearchParams()
    sp.set('page', String(params.page))
    if (params.limit) sp.set('limit', String(params.limit))
    return apiFetch(`/api/categories?${sp.toString()}`)
  }
  const json = await apiFetch('/api/categories')
  return json.data ?? []
}

/** POST /api/categories */
export async function createCategory(name) {
  return apiFetch('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/**
 * POST /api/categories/bulk
 * Bulk CSV or sheet import with template row filtering and deduplication.
 */
export async function bulkImportCategories(items, source = 'csv') {
  return apiFetch('/api/categories/bulk', {
    method: 'POST',
    body: JSON.stringify({ items, source }),
  })
}

/**
 * POST /api/categories/resolve
 * Case-insensitive find-or-create for CSV import.
 */
export async function resolveCategory(name) {
  return apiFetch('/api/categories/resolve', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/** DELETE /api/categories/:id */
export async function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, {
    method: 'DELETE',
  })
}

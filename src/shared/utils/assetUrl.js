export function resolveAdminAssetUrl(path) {
  if (!path || !String(path).trim()) return ''
  const value = String(path).trim()
  if (/^(data:|blob:|https?:\/\/)/i.test(value) || value.startsWith('//')) {
    return value.startsWith('//') ? `https:${value}` : value
  }
  const base = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.BASE_URL || '').replace(
    /\/$/,
    '',
  )
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${base}${normalized}`
}

export function isInlineAssetUrl(value) {
  const url = String(value || '').trim()
  return url.startsWith('data:') || url.startsWith('blob:')
}

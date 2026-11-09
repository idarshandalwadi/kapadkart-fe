// Pages is HTTPS. The Lightsail API is HTTP, so the browser must stay on this
// site. These routes forward /api, /uploads, and /images to nginx, which
// serves the API under /kapadkart. Nginx on the live host does not insert
// /v1, so /api/auth/login becomes /kapadkart/api/v1/auth/login.

// Cloudflare Pages refuses a fetch() to a raw IP (error 1003). sslip.io is a
// public DNS name for this same Lightsail address. The browser still talks
// only to the Pages host.
const UPSTREAM_ORIGIN = 'http://13.234.170.148.sslip.io'
const UPSTREAM_PREFIX = '/kapadkart'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

export function toUpstreamPath(pathname) {
  if (pathname === '/api') return `${UPSTREAM_PREFIX}/api/v1`
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) {
    return `${UPSTREAM_PREFIX}${pathname}`
  }
  if (pathname.startsWith('/api/')) {
    return `${UPSTREAM_PREFIX}${pathname.replace(/^\/api\//, '/api/v1/')}`
  }
  return `${UPSTREAM_PREFIX}${pathname}`
}

export function toUpstreamUrl(requestUrl) {
  const incoming = new URL(requestUrl)
  return new URL(toUpstreamPath(incoming.pathname) + incoming.search, UPSTREAM_ORIGIN)
}

function rewriteSetCookie(cookie) {
  // Drop Domain so the browser stores the cookie for the Pages host.
  return cookie.replace(/;\s*Domain=[^;]*/gi, '')
}

function copyResponseHeaders(upstream) {
  const headers = new Headers()
  for (const [key, value] of upstream.headers) {
    if (key.toLowerCase() === 'set-cookie' || HOP_BY_HOP.has(key.toLowerCase())) continue
    headers.append(key, value)
  }
  const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : []
  for (const cookie of cookies) {
    headers.append('set-cookie', rewriteSetCookie(cookie))
  }
  return headers
}

export async function proxyRequest(request) {
  const incoming = new URL(request.url)
  const target = toUpstreamUrl(request.url)
  const headers = new Headers(request.headers)

  for (const name of HOP_BY_HOP) headers.delete(name)
  // The API rejects Origins that are not listed in FRONTEND_ORIGIN.
  // This call is server-to-server; the browser only talks to Pages.
  headers.delete('origin')
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) headers.set('x-forwarded-for', clientIp)
  headers.set('x-forwarded-host', incoming.host)
  headers.set('x-forwarded-proto', 'https')

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
    init.duplex = 'half'
  }

  let upstream
  try {
    upstream = await fetch(target, init)
  } catch {
    return Response.json(
      { status: 'error', message: 'KapadKart API is unreachable.' },
      { status: 502 },
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyResponseHeaders(upstream),
  })
}

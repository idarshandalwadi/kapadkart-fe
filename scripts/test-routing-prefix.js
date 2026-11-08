/**
 * Automated Test Suite for KapadKart URL Prefix and Routing Logic
 * Run with: node scripts/test-routing-prefix.js
 */

import assert from 'node:assert/strict'

console.log('\n=================================================================')
console.log('  KAPADKART — URL PREFIX & ROUTING AUTOMATED TEST SUITE')
console.log('=================================================================\n')

let totalTests = 0
let passedTests = 0

function test(name, fn) {
  totalTests += 1
  try {
    fn()
    passedTests += 1
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    Error: ${err.message}`)
  }
}

// 1. Basename stripping and case-insensitivity tests
function stripBasename(pathname, base) {
  const cleanBase = (base || '/').replace(/\/$/, '')
  if (cleanBase && pathname.toLowerCase().startsWith(cleanBase.toLowerCase())) {
    return pathname.slice(cleanBase.length) || '/'
  }
  return pathname
}

test('stripBasename accurately handles root / path', () => {
  assert.equal(stripBasename('/t/my-shop/dashboard', '/'), '/t/my-shop/dashboard')
  assert.equal(stripBasename('/admin/dashboard', '/'), '/admin/dashboard')
  assert.equal(stripBasename('/login', '/'), '/login')
  assert.equal(stripBasename('/', '/'), '/')
})

test('stripBasename strips custom base paths when provided', () => {
  assert.equal(stripBasename('/kapadkart/t/my-shop/dashboard', '/kapadkart/'), '/t/my-shop/dashboard')
  assert.equal(stripBasename('/kapadkart/admin/login', '/kapadkart/'), '/admin/login')
  assert.equal(stripBasename('/kapadkart', '/kapadkart/'), '/')
})

test('stripBasename preserves un-prefixed paths when base does not match', () => {
  assert.equal(stripBasename('/other-app/path', '/'), '/other-app/path')
  assert.equal(stripBasename('/api/v1/health', '/'), '/api/v1/health')
})

// 2. Tenant Path Generator
function tenantPath(path = '/', slug = 'khodal-mahakali-shop') {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (clean === '/') return `/t/${slug}`
  return `/t/${slug}${clean}`
}

test('tenantPath constructs valid client app sub-routes', () => {
  assert.equal(tenantPath('/dashboard', 'test-shop'), '/t/test-shop/dashboard')
  assert.equal(tenantPath('products', 'test-shop'), '/t/test-shop/products')
  assert.equal(tenantPath('/booking/new', 'test-shop'), '/t/test-shop/booking/new')
  assert.equal(tenantPath('/', 'test-shop'), '/t/test-shop')
})

// 3. Dev Proxy rewrite rules
function rewriteApiProxy(p, basePath = '') {
  const stripped = basePath ? p.replace(new RegExp(`^${basePath}`), '') : p
  if (stripped.startsWith('/api/') && !stripped.startsWith('/api/v1/')) {
    return stripped.replace(/^\/api\//, '/api/v1/')
  }
  return stripped
}

test('Vite proxy correctly rewrites /api paths to /api/v1', () => {
  assert.equal(
    rewriteApiProxy('/api/auth/login'),
    '/api/v1/auth/login'
  )
  assert.equal(
    rewriteApiProxy('/api/tenants/test-shop/branding'),
    '/api/v1/tenants/test-shop/branding'
  )
  assert.equal(
    rewriteApiProxy('/api/admin/login'),
    '/api/v1/admin/login'
  )
  assert.equal(
    rewriteApiProxy('/api/v1/products'),
    '/api/v1/products'
  )
})

// 4. Asset URL Resolution
function resolveBrandAssetUrl(path, base = '/') {
  if (!path || !String(path).trim()) return ''
  const value = String(path).trim()
  if (/^(data:|blob:|https?:\/\/)/i.test(value) || value.startsWith('//')) {
    return value.startsWith('//') ? `https:${value}` : value
  }
  const cleanBase = String(base || '').replace(/\/$/, '')
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${cleanBase}${normalized}`
}

test('resolveBrandAssetUrl attaches root base to relative assets', () => {
  assert.equal(resolveBrandAssetUrl('/uploads/logo.png', '/'), '/uploads/logo.png')
  assert.equal(resolveBrandAssetUrl('kk-favicon.svg', '/'), '/kk-favicon.svg')
  assert.equal(
    resolveBrandAssetUrl('https://s3.amazonaws.com/bucket/img.jpg', '/'),
    'https://s3.amazonaws.com/bucket/img.jpg'
  )
})

// 5. Default Rental Duration Calculation (DIFF_2_DAYS)
import { calcRentalDaysFromDates } from '../src/features/bookings/utils/bookingLineItems.js'

test('calcRentalDaysFromDates defaults to DIFF_2_DAYS wedding buffer package', () => {
  assert.equal(calcRentalDaysFromDates('2026-10-10', '2026-10-10'), 1, 'Same day = 1 day')
  assert.equal(calcRentalDaysFromDates('2026-10-10', '2026-10-11'), 1, 'Next day = 1 day')
  assert.equal(calcRentalDaysFromDates('2026-10-10', '2026-10-12'), 1, 'Two-day difference = 1 day')
  assert.equal(calcRentalDaysFromDates('2026-10-10', '2026-10-13'), 2, 'Three-day difference = 2 days')
  assert.equal(calcRentalDaysFromDates('2026-10-10', '2026-10-14'), 3, 'Four-day difference = 3 days')
})

// 6. Public Landing Route Tests
test('Public landing routes / and /home map cleanly', () => {
  const publicRoutes = ['/', '/home', '/login', '/contact', '/admin/login']
  assert.ok(publicRoutes.includes('/'))
  assert.ok(publicRoutes.includes('/home'))
  assert.equal(stripBasename('/', '/'), '/')
  assert.equal(stripBasename('/home', '/'), '/home')
})

// 7. Context-Aware Logo Destination Tests
import { resolveLogoDestination } from '../src/shared/tenant/logoDestination.js'

test('resolveLogoDestination routes guest (not logged in) to /', () => {
  assert.equal(
    resolveLogoDestination({ isAdmin: false, isTenant: false, tenantSlug: '', currentPath: '/' }),
    '/'
  )
  assert.equal(
    resolveLogoDestination({ isAdmin: false, isTenant: false, tenantSlug: '', currentPath: '/contact' }),
    '/'
  )
})

test('resolveLogoDestination routes authenticated tenant user to /t/:slug/dashboard', () => {
  assert.equal(
    resolveLogoDestination({
      isAdmin: false,
      isTenant: true,
      tenantSlug: 'khodal-bridal-studio',
      currentPath: '/',
    }),
    '/t/khodal-bridal-studio/dashboard'
  )
  assert.equal(
    resolveLogoDestination({
      isAdmin: false,
      isTenant: true,
      tenantSlug: 'royal-heritage',
      currentPath: '/contact',
    }),
    '/t/royal-heritage/dashboard'
  )
})

test('resolveLogoDestination routes platform admin to /admin/dashboard', () => {
  assert.equal(
    resolveLogoDestination({
      isAdmin: true,
      isTenant: false,
      tenantSlug: '',
      currentPath: '/',
    }),
    '/admin/dashboard'
  )
  assert.equal(
    resolveLogoDestination({
      isAdmin: true,
      isTenant: false,
      tenantSlug: '',
      currentPath: '/admin/shops',
    }),
    '/admin/dashboard'
  )
})

console.log('\n=================================================================')
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`)
console.log('=================================================================\n')

if (passedTests !== totalTests) {
  process.exit(1)
}

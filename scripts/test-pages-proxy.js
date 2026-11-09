import assert from 'node:assert/strict'
import { toUpstreamPath, toUpstreamUrl } from '../functions/_lib/upstream.js'

assert.equal(toUpstreamPath('/api/auth/login'), '/kapadkart/api/v1/auth/login')
assert.equal(toUpstreamPath('/api'), '/kapadkart/api/v1')
assert.equal(toUpstreamPath('/api/v1/health'), '/kapadkart/api/v1/health')
assert.equal(toUpstreamPath('/uploads/logo.png'), '/kapadkart/uploads/logo.png')

const login = toUpstreamUrl('https://kapadkart.pages.dev/api/auth/login?next=/dashboard')
assert.equal(login.href, 'http://13.234.170.148.sslip.io/kapadkart/api/v1/auth/login?next=/dashboard')

console.log('✔ Pages proxy rewrites /api to the Lightsail /api/v1 path')

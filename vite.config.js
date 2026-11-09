import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const base = process.env.VITE_BASE_PATH || '/'
const basePath = base === '/' ? '' : base.replace(/\/$/, '')
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: false, // Managed via public/manifest.webmanifest and dynamic TenantContext injection
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,ico}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/uploads\//,
          /^\/images\//,
          /^\/b\//,
          /\.webmanifest$/,
          new RegExp(`^${basePath}/api/`),
          new RegExp(`^${basePath}/uploads/`),
          new RegExp(`^${basePath}/images/`),
          new RegExp(`^${basePath}/b/`),
        ],
        runtimeCaching: [
          // 1. Google Fonts Stylesheets
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kapadkart-google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 2. Google Fonts Webfont Binaries
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'kapadkart-google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 3. Product & Uploaded Images (CDN, S3, /uploads/)
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' ||
              /\.(?:png|jpg|jpeg|svg|webp|avif|gif)$/i.test(url.pathname) ||
              url.pathname.includes('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kapadkart-product-images',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 4. Safe Public GET API Cache (branding, public catalogue, categories, brands)
          {
            urlPattern: ({ request, url }) => {
              if (request.method !== 'GET') return false
              if (
                /(\/api\/auth|\/api\/users\/me|\/api\/billing|\/api\/sales\/add|\/api\/booking\/add|\/api\/checkout|\/api\/payment)/i.test(
                  url.pathname
                )
              ) {
                return false
              }
              return (
                url.pathname.includes('/api/tenants/') ||
                url.pathname.includes('/api/categories') ||
                url.pathname.includes('/api/brands')
              );
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kapadkart-public-api-data',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 10 * 60, // 10 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      ...(basePath
        ? {
            [`${basePath}/api`]: {
              target: backendTarget,
              changeOrigin: true,
              rewrite: (p) => {
                const stripped = p.replace(new RegExp(`^${basePath}`), '')
                if (stripped.startsWith('/api/') && !stripped.startsWith('/api/v1/')) {
                  return stripped.replace(/^\/api\//, '/api/v1/')
                }
                return stripped
              },
            },
            [`${basePath}/images`]: {
              target: backendTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(new RegExp(`^${basePath}`), ''),
            },
            [`${basePath}/b`]: {
              target: backendTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(new RegExp(`^${basePath}`), ''),
            },
            [`${basePath}/uploads`]: {
              target: backendTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(new RegExp(`^${basePath}`), ''),
            },
          }
        : {}),
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (p) => (p.startsWith('/api/v1/') ? p : p.replace(/^\/api\//, '/api/v1/')),
      },
      '/b': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
              return 'vendor-charts'
            }
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react'
            }
            if (id.includes('qrcode.react') || id.includes('react-easy-crop') || id.includes('sonner')) {
              return 'vendor-ui'
            }
          }
        },
      },
    },
  },
})

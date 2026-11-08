# KapadKart shop app

React 19 shop application for a KapadKart tenant: catalog, rentals, sales, bills, and shop settings. It is a Vite app and does not connect to PostgreSQL. All data comes from the KapadKart API.

Run the API (`kapadkart`) before this app. Platform-wide shop management lives in `kapadkart-admin`.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- KapadKart API on http://localhost:4000

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173.

`npm run dev` loads `.env.development`:

```env
VITE_BASE_PATH=/
VITE_API_BASE_URL=
VITE_BACKEND_URL=http://localhost:4000
VITE_DEFAULT_TENANT_SLUG=demo-shop
```

An empty `VITE_API_BASE_URL` sends requests to this dev server. Vite proxies `/api` to the API and rewrites `/api/...` to `/api/v1/...`. It also proxies `/uploads` and `/b`.

The dev server uses port 5173 and will not fall back to another port (`strictPort`).

## Production build

Copy `.env.example` to `.env` and set the public API origin:

```env
VITE_BASE_PATH=/
VITE_API_BASE_URL=https://www.api.kapadkart.mohammadaman.in
VITE_BACKEND_URL=http://localhost:4000
VITE_DEFAULT_TENANT_SLUG=demo-shop
```

```bash
npm run build
npm run preview
```

`VITE_*` values are embedded in the browser bundle. Do not put secrets in this project's env files.

`VITE_BACKEND_URL` is used only by the Vite dev proxy. Production traffic uses `VITE_API_BASE_URL`.

## Routes

| URL | Page |
|---|---|
| http://localhost:5173/ | Public home |
| http://localhost:5173/login | Shop login |
| http://localhost:5173/t/:tenantSlug/dashboard | Shop dashboard after login |

The tenant slug comes from the URL (`/t/:slug`), then from the saved session, then from `VITE_DEFAULT_TENANT_SLUG`. A shop exists only after it is created in the admin panel. The API seed creates a platform admin, not a demo shop.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite on port 5173 |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serve the production bundle |
| `npm run deploy` | Build and publish `dist/` to Cloudflare Pages project `kapadkart` |
| `npm run lint` | oxlint |
| `npm test` | Static checks for exports, routing, support pages, alerts, and sales flow |

## Stack

React 19, React Router 7, Tailwind CSS 4, Vite 8, and a PWA service worker (`vite-plugin-pwa`). Source lives in `src/features` and `src/shared`. The `@` alias maps to `src/`.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { fetchTenantBranding } from '@/features/tenants/api/tenants'
import {
  DEFAULT_TENANT_SLUG,
  getSessionTenantSlug,
  resolveBrandAssetUrl,
  setTenantSlug,
  tenantPath,
} from '@/shared/tenant/tenant'

const TenantContext = createContext(null)

const PLATFORM_NAME = 'KapadKart'
const FALLBACK_LOGO = `${import.meta.env.BASE_URL}kapad-kart-logo.svg`
const FALLBACK_FAVICON = `${import.meta.env.BASE_URL}kk-favicon.svg`

function setDocumentFavicon(href) {
  const nextHref = href || FALLBACK_FAVICON
  let link = document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = nextHref.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  link.href = nextHref
}

const DEFAULT_MANIFEST = `${import.meta.env.BASE_URL}manifest.webmanifest`

function resetDocumentBranding() {
  document.title = PLATFORM_NAME
  setDocumentFavicon(FALLBACK_FAVICON)

  const themeMeta = document.querySelector("meta[name='theme-color']")
  if (themeMeta) themeMeta.content = '#d97706'

  const manifestLink = document.querySelector("link[rel='manifest']")
  if (manifestLink && manifestLink.href.startsWith('blob:')) {
    URL.revokeObjectURL(manifestLink.href)
    manifestLink.href = DEFAULT_MANIFEST
  }
}

function applyBrandingToDocument(branding) {
  if (!branding) {
    resetDocumentBranding()
    return
  }

  const title = branding.page_title || branding.company_name || branding.name || PLATFORM_NAME
  document.title = title

  const faviconUrl = resolveBrandAssetUrl(branding.favicon_url)
  setDocumentFavicon(faviconUrl || FALLBACK_FAVICON)

  const themeColor = '#d97706'

  // Update Android & browser status bar tint
  let themeMeta = document.querySelector("meta[name='theme-color']")
  if (!themeMeta) {
    themeMeta = document.createElement('meta')
    themeMeta.name = 'theme-color'
    document.head.appendChild(themeMeta)
  }
  themeMeta.content = themeColor

  const appleTitle = title.slice(0, 16)
  let appleTitleMeta = document.querySelector("meta[name='apple-mobile-web-app-title']")
  if (!appleTitleMeta) {
    appleTitleMeta = document.createElement('meta')
    appleTitleMeta.name = 'apple-mobile-web-app-title'
    document.head.appendChild(appleTitleMeta)
  }
  appleTitleMeta.content = appleTitle

  // Ensure manifest link remains a valid HTTP URL for Chromium / Safari PWA installability
  let link = document.querySelector("link[rel='manifest']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  if (link.href.startsWith('blob:')) {
    URL.revokeObjectURL(link.href)
  }
  link.href = DEFAULT_MANIFEST
}

export function TenantProvider() {
  const { user } = useAuth()
  const { tenantSlug } = useParams()
  const slug = (tenantSlug || DEFAULT_TENANT_SLUG).trim().toLowerCase()

  const [branding, setBranding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Never let another shop's URL overwrite the signed-in shop.
    const sessionSlug = getSessionTenantSlug()
    if (!sessionSlug || sessionSlug === slug) setTenantSlug(slug)
  }, [slug])

  const refreshBranding = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json = await fetchTenantBranding(slug)
      setBranding(json.data)
      applyBrandingToDocument(json.data)
      return json.data
    } catch (err) {
      setBranding(null)
      setError(err.message || 'Failed to load shop branding')
      resetDocumentBranding()
      throw err
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const json = await fetchTenantBranding(slug)
        if (cancelled) return
        setBranding(json.data)
        applyBrandingToDocument(json.data)
      } catch (err) {
        if (cancelled) return
        setBranding(null)
        setError(err.message || 'Failed to load shop branding')
        resetDocumentBranding()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const value = useMemo(() => {
    // Unknown / unregistered tenants must never surface the URL slug as branding.
    const companyName = branding?.company_name || branding?.name || PLATFORM_NAME
    const logoUrl = resolveBrandAssetUrl(branding?.logo_url) || FALLBACK_LOGO

    const authTenant = user?.tenant
    const rawType =
      authTenant?.businessType ||
      authTenant?.business_type ||
      branding?.business_type ||
      branding?.businessType ||
      'SALES_AND_RENTAL'
    const businessType = String(rawType).toUpperCase()
    const isRentalAllowed = businessType !== 'SALES'
    const isSalesAllowed = businessType !== 'RENTAL'
    const limits = {
      maxProducts: authTenant?.maxProducts ?? authTenant?.max_products ?? branding?.max_products ?? branding?.maxProducts ?? null,
      maxBookings: authTenant?.maxBookings ?? authTenant?.max_bookings ?? branding?.max_bookings ?? branding?.maxBookings ?? null,
      maxSales: authTenant?.maxSales ?? authTenant?.max_sales ?? branding?.max_sales ?? branding?.maxSales ?? null,
    }

    return {
      slug,
      branding,
      businessType,
      isRentalAllowed,
      isSalesAllowed,
      limits,
      loading,
      error,
      companyName,
      pageTitle: branding?.page_title || companyName,
      logoUrl,
      path: (p) => tenantPath(p, slug),
      refreshBranding,
    }
  }, [slug, branding, loading, error, refreshBranding, user?.tenant])

  return (
    <TenantContext.Provider value={value}>
      <Outlet />
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}

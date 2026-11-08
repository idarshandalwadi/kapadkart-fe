import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '@/shared/components/BrandLogo'
import { useAuth as useTenantAuth } from '@/features/auth/context/AuthContext'
import { useAuth as useAdminAuth } from '@/features/admin/auth/AuthContext'
import { tenantPath, getTenantSlug } from '@/shared/tenant/tenant'
import { useLogoDestination } from '@/shared/hooks/useLogoDestination'
import { cn } from '@/shared/utils/cn'

const PLATFORM_NAME = 'KapadKart'
const FALLBACK_LOGO = `${import.meta.env.BASE_URL}kapad-kart-logo.svg`

export function PublicNavbar({ className }) {
  const location = useLocation()
  const tenantAuth = useTenantAuth()
  const adminAuth = useAdminAuth()
  const slug = getTenantSlug()
  const logoDestination = useLogoDestination()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isHome = location.pathname === '/' || location.pathname === '/home'
  const isContact = location.pathname === '/contact' || location.pathname === '/contact-us'

  const isAdmin = Boolean(adminAuth?.authenticated && adminAuth?.adminUser)
  const isTenant = Boolean(tenantAuth?.isAuthenticated && tenantAuth?.user)

  const navLinks = [
    { label: 'Why KapadKart', href: isHome ? '#problem-solution' : '/#problem-solution' },
    { label: 'How It Works', href: isHome ? '#how-it-works' : '/#how-it-works' },
    { label: 'Features', href: isHome ? '#capabilities' : '/#capabilities' },
    { label: 'Boutiques', href: isHome ? '#audiences' : '/#audiences' },
  ]

  return (
    <header className={cn('sticky top-0 z-50 border-b border-border/80 bg-surface/95 backdrop-blur-md', className)}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <div className="flex shrink-0 items-center">
          <Link to={logoDestination} className="flex items-center transition-opacity hover:opacity-90">
            <BrandLogo
              src={FALLBACK_LOGO}
              alt={PLATFORM_NAME}
              surface="light"
              imgClassName="h-9 w-auto max-w-[170px]"
            />
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
          {navLinks.map((item) =>
            item.href.startsWith('/') ? (
              <Link
                key={item.label}
                to={item.href}
                className="text-sm font-medium whitespace-nowrap text-text-secondary transition-colors hover:text-accent"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium whitespace-nowrap text-text-secondary transition-colors hover:text-accent"
              >
                {item.label}
              </a>
            ),
          )}
          <Link
            to="/contact"
            className={cn(
              'text-sm font-medium whitespace-nowrap transition-colors hover:text-accent',
              isContact ? 'text-accent font-semibold' : 'text-text-secondary',
            )}
          >
            Contact
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          {isAdmin ? (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-all hover:bg-accent-hover active:translate-y-px"
            >
              <i className="fa-solid fa-gauge-high" aria-hidden="true" />
              Admin Dashboard
            </Link>
          ) : isTenant ? (
            <Link
              to={tenantPath('/dashboard', slug || tenantAuth.user?.tenant?.slug)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-all hover:bg-accent-hover active:translate-y-px"
            >
              <i className="fa-solid fa-gauge-high" aria-hidden="true" />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/admin/login"
                className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold whitespace-nowrap text-text-secondary transition-colors hover:border-accent hover:text-text sm:inline-flex"
              >
                <i className="fa-solid fa-shield-halved text-muted" aria-hidden="true" />
                Admin Portal
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-all hover:bg-accent-hover active:translate-y-px"
              >
                <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                Sign In to Store
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:text-text hover:bg-surface-muted lg:hidden"
          >
            <i className={cn('fa-solid text-sm', mobileMenuOpen ? 'fa-xmark' : 'fa-bars')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/80 bg-surface px-4 py-3 shadow-md lg:hidden animate-fade-up">
          <nav className="flex flex-col gap-2.5">
            {navLinks.map((item) =>
              item.href.startsWith('/') ? (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 text-sm font-medium text-text-secondary hover:text-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 text-sm font-medium text-text-secondary hover:text-accent"
                >
                  {item.label}
                </a>
              ),
            )}
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'py-1 text-sm font-medium hover:text-accent',
                isContact ? 'text-accent font-semibold' : 'text-text-secondary',
              )}
            >
              Contact
            </Link>
            {!isAdmin && !isTenant && (
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 inline-flex items-center gap-1.5 border-t border-border/60 pt-2 text-xs font-medium text-text-secondary hover:text-accent sm:hidden"
              >
                <i className="fa-solid fa-shield-halved text-muted" aria-hidden="true" />
                Admin Portal
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default PublicNavbar


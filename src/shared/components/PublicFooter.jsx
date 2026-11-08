import { Link } from 'react-router-dom'
import BrandLogo from '@/shared/components/BrandLogo'
import { useLogoDestination } from '@/shared/hooks/useLogoDestination'
import { SUPPORT_CONFIG, buildSupportTelUrl } from '@/config/support'
import { cn } from '@/shared/utils/cn'

const PLATFORM_NAME = 'KapadKart'
const FALLBACK_LOGO = `${import.meta.env.BASE_URL}kapad-kart-logo.svg`

export function PublicFooter({ className }) {
  const logoDestination = useLogoDestination()

  return (
    <footer className={cn('border-t border-border/80 bg-surface px-4 py-10 sm:px-6 lg:px-8', className)}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <Link to={logoDestination} className="flex items-center transition-opacity hover:opacity-90">
            <BrandLogo
              src={FALLBACK_LOGO}
              alt={PLATFORM_NAME}
              surface="light"
              imgClassName="h-8 w-auto max-w-[150px]"
            />
          </Link>
          <span className="text-xs text-text-muted">
            • Multi-Tenant Rental &amp; POS SaaS
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-text-secondary">
          <Link to="/login" className="hover:text-accent transition-colors">
            Shop Login
          </Link>
          <Link to="/admin/login" className="hover:text-accent transition-colors">
            Platform Admin
          </Link>
          <Link to="/contact" className="hover:text-accent transition-colors">
            Help & Support
          </Link>
          <a href={buildSupportTelUrl()} className="hover:text-accent transition-colors inline-flex items-center gap-1.5">
            <i className="fa-solid fa-phone text-[10px]" aria-hidden="true" />
            {SUPPORT_CONFIG.phoneDisplay}
          </a>
        </div>

        <div className="text-xs text-text-muted">
          &copy; {new Date().getFullYear()} {PLATFORM_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter

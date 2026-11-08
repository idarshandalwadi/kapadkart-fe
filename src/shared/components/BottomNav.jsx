import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useTenant } from '@/shared/tenant/TenantContext'
import { cn } from '@/shared/utils/cn'

export default function BottomNav({ sidebarOpen = false }) {
  const { path, businessType: tenantContextType } = useTenant()
  const { user } = useAuth()
  const businessType = user?.tenant?.businessType || user?.tenant?.business_type || tenantContextType || 'SALES_AND_RENTAL'
  const isRentalAllowed = businessType !== 'SALES'
  const isSalesAllowed = businessType !== 'RENTAL'
  const location = useLocation()

  const reportsDefault = isSalesAllowed && !isRentalAllowed ? 'reports/sales' : 'reports/rental'

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', path: 'dashboard', icon: 'fa-solid fa-gauge-high' },
    ...(isRentalAllowed
      ? [{ key: 'booking', label: 'Rentals', path: 'booking', icon: 'fa-solid fa-calendar-check', highlight: !isSalesAllowed }]
      : []),
    ...(isSalesAllowed
      ? [{ key: 'sales', label: 'POS Sale', path: 'sales', icon: 'fa-solid fa-cash-register', highlight: true }]
      : []),
    { key: 'products', label: 'Products', path: 'products', icon: 'fa-solid fa-shirt' },
    { key: 'reports', label: 'Reports', path: reportsDefault, icon: 'fa-solid fa-chart-pie' },
    { key: 'settings', label: 'Settings', path: 'settings/company', icon: 'fa-solid fa-gear' },
  ]

  const isActive = (itemKey, navPath) => {
    const appPath = location.pathname.replace(/^\/t\/[^/]+/, '')
    if (itemKey === 'dashboard') {
      return appPath === '' || appPath === '/' || appPath === '/dashboard' || appPath.startsWith('/dashboard/')
    }
    if (itemKey === 'reports') {
      return appPath === '/reports' || appPath.startsWith('/reports/') || appPath.startsWith('/sales-reports')
    }
    if (itemKey === 'settings') {
      return appPath === '/settings' || appPath.startsWith('/settings/')
    }
    if (itemKey === 'products') {
      return appPath === '/products' || appPath.startsWith('/products/')
    }
    if (itemKey === 'sales') {
      return appPath === '/sales' || appPath.startsWith('/sales/')
    }
    if (itemKey === 'booking') {
      return appPath === '/booking' || appPath.startsWith('/booking/')
    }
    return appPath === `/${navPath}` || appPath.startsWith(`/${navPath}/`)
  }

  return (
    <nav
      id="bottom-nav"
      aria-label="Mobile main navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 min-[900px]:hidden',
        'flex items-stretch justify-around',
        'bg-[#121315]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]',
        'pb-[env(safe-area-inset-bottom,0px)]',
        'min-h-[3.6rem] transition-all duration-200',
        sidebarOpen && 'pointer-events-none opacity-0 translate-y-full',
      )}
    >
      {navItems.map((item) => {
        const active = isActive(item.key, item.path)
        return (
          <NavLink
            key={item.key}
            to={path(`/${item.path}`)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-[0.2rem] py-1.5 px-0.5',
              'min-h-[48px]',
              'text-[0.6rem] sm:text-[0.62rem] font-semibold tracking-wide select-none',
              '[-webkit-tap-highlight-color:transparent]',
              'transition-all duration-150',
              active
                ? item.highlight ? 'text-amber-400' : 'text-amber-400'
                : 'text-[#8a929e] hover:text-white active:scale-95',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <span
                className={cn(
                  'absolute top-0 block h-[3px] w-[1.75rem] rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]',
                  'bg-amber-400',
                )}
                aria-hidden="true"
              />
            )}
            <div
              className={cn(
                'flex items-center justify-center transition-transform duration-150',
                item.highlight && active && 'scale-110',
              )}
            >
              <i
                className={cn(
                  item.icon,
                  'text-[1.1rem] leading-none',
                  active && 'drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]',
                )}
                aria-hidden="true"
              />
            </div>
            <span className="leading-none tracking-tight truncate max-w-[56px] text-center">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

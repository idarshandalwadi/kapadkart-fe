import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import softwareLogo from '@/assets/kapad-kart-logo.svg'
import BottomNav from '@/shared/components/BottomNav'
import PWAInstallBanner from '@/shared/components/PWAInstallBanner'
import ErrorBoundary from '@/shared/components/ErrorBoundary'
import { useTenant } from '@/shared/tenant/TenantContext'
import { cn } from '@/shared/utils/cn'

function SidebarNavLink({ to, end, icon, label, sub = false, className, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-4 rounded-tl-[20px] rounded-br-[20px] no-underline transition-[color] duration-160',
          sub ? 'px-[0.8rem] py-[0.6rem] text-[0.9rem]' : 'px-[0.95rem] py-[0.8rem] text-[0.95rem]',
          isActive
            ? 'bg-[linear-gradient(135deg,#ffc300_0%,#c29571_50%,#363a3d_100%_100%)] font-bold text-white'
            : 'font-medium text-[#c2c8cf] hover:bg-white/10 hover:text-white',
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          <i
            className={cn(
              icon,
              'w-[1.15rem] shrink-0 text-center text-[1.05rem] transition-colors duration-160',
              isActive ? 'text-white' : 'text-[#9aa3ad] group-hover:text-[#fbbf24]',
            )}
            aria-hidden="true"
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function SidebarParentButton({ icon, label, className, onClick, expanded }) {
  return (
    <button
      type="button"
      className={cn(
        'group flex flex-1 cursor-pointer items-center gap-4 rounded-tl-[20px] rounded-br-[20px] border-0 bg-transparent px-[0.95rem] py-[0.8rem] text-left text-[0.95rem] font-medium text-[#c2c8cf] shadow-none outline-none appearance-none [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-white focus:bg-transparent focus:outline-none focus-visible:outline-none active:bg-transparent',
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-expanded={expanded}
    >
      <i
        className={cn(
          icon,
          'w-[1.15rem] shrink-0 text-center text-[1.05rem] text-[#9aa3ad] transition-colors duration-160 group-hover:text-[#fbbf24]',
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  )
}

function SidebarChevron({ open }) {
  return (
    <span
      className={cn(
        'block h-[0.45rem] w-[0.45rem] border-r-2 border-b-2 border-current transition-transform duration-150',
        open ? 'rotate-45' : '-rotate-45',
      )}
      aria-hidden="true"
    />
  )
}

const submenuToggleClass =
  'inline-flex w-[2.35rem] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-transparent text-[#9aa3ad] transition-[background-color,color,border-color] duration-160 hover:border-white/6 hover:bg-white/10 hover:text-[#fbbf24]'

const submenuListClass =
  'm-0 mt-[0.25rem] mb-[0.4rem] ml-[0.85rem] list-none border-l-2 border-gold/40 py-0 pr-0 pl-[0.7rem]'

/** Path after /t/:tenantSlug, e.g. /reports/sales */
function getTenantAppPath(pathname) {
  const match = String(pathname || '').match(/^\/t\/[^/]+(\/.*)?$/)
  if (!match) return String(pathname || '')
  return match[1] || '/'
}

/** True for /sales and /sales/*, never /reports/sales. */
function isSalesSectionPath(pathname) {
  const appPath = getTenantAppPath(pathname)
  return appPath === '/sales' || appPath.startsWith('/sales/')
}

function isReportsSectionPath(pathname) {
  const appPath = getTenantAppPath(pathname)
  return (
    appPath === '/reports' ||
    appPath.startsWith('/reports/') ||
    appPath === '/sales-reports' ||
    appPath.startsWith('/sales-reports/')
  )
}

function getOpenMenuFromPath(pathname) {
  const appPath = getTenantAppPath(pathname)
  if (appPath === '/booking' || appPath.startsWith('/booking/')) return 'bookings'
  if (isSalesSectionPath(pathname)) return 'sales'
  if (appPath === '/products' || appPath.startsWith('/products/')) return 'products'
  if (isReportsSectionPath(pathname)) return 'reports'
  if (appPath === '/settings' || appPath.startsWith('/settings/')) return 'settings'
  return null
}

function Layout() {
  const { user, logout } = useAuth()
  const { companyName, path, businessType: tenantContextType } = useTenant()
  const businessType = user?.tenant?.businessType || user?.tenant?.business_type || tenantContextType || 'SALES_AND_RENTAL'
  const isRentalAllowed = businessType !== 'SALES'
  const isSalesAllowed = businessType !== 'RENTAL'

  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(() => getOpenMenuFromPath(location.pathname))
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const bookingsOpen = openMenu === 'bookings'
  const salesOpen = openMenu === 'sales'
  const productsOpen = openMenu === 'products'
  const reportsOpen = openMenu === 'reports'
  const settingsOpen = openMenu === 'settings'

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  const goToMenu = (menu, to) => {
    setOpenMenu(menu)
    // Open the submenu first, then navigate so the gold state lands on the child
    // instead of flashing on the parent title during the same click.
    requestAnimationFrame(() => {
      navigate(to)
    })
  }

  useEffect(() => {
    setSidebarOpen(false)
    setOpenMenu(getOpenMenuFromPath(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }

    document.body.classList.add('sidebar-open')
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.classList.remove('sidebar-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [sidebarOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/login', {
      replace: true,
      state: { notice: 'Signed out successfully' },
    })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-[auto_1fr] min-[900px]:grid-cols-[16.75rem_1fr] min-[900px]:grid-rows-1">
      <header className="sticky top-0 z-40 flex min-h-[3.4rem] items-center gap-3 border-b border-ink-line px-4 py-[0.65rem] text-white [background:linear-gradient(135deg,rgba(245,158,11,0.26),transparent_45%),var(--color-ink)] min-[900px]:hidden">
        <button
          type="button"
          className="inline-flex h-[2.35rem] w-[2.35rem] shrink-0 cursor-pointer flex-col justify-center gap-1 rounded-md border border-white/18 bg-white/4 p-[0.45rem] transition-[background-color,border-color] duration-160 hover:border-white/28 hover:bg-white/10"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span className="block h-[2px] w-full rounded-[1px] bg-white" />
          <span className="block h-[2px] w-full rounded-[1px] bg-white" />
          <span className="block h-[2px] w-full rounded-[1px] bg-white" />
        </button>
        <div className="min-w-0 flex-1 flex justify-start">
          <Link
            to={path('/dashboard')}
            className="flex items-center transition-opacity hover:opacity-90"
            title="Go to Dashboard"
          >
            <img
              src={softwareLogo}
              alt="KapadKart"
              className="h-8 w-auto max-w-[11.5rem] object-contain"
            />
          </Link>
        </div>
        <div className="relative">
          <button
            type="button"
            className="flex h-[2.35rem] w-[2.35rem] shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/18 bg-white/4 text-white transition-[background-color,border-color] duration-160 hover:border-white/28 hover:bg-white/10"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            <i className="fa-solid fa-user" />
          </button>
          
          {userMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-[calc(100%+0.5rem)] w-48 rounded-lg border border-white/10 bg-[#262b31] py-1 shadow-xl z-50 animate-fade-up">
                <Link
                  to={path('/settings')}
                  className="block px-4 py-2.5 text-[0.95rem] text-white hover:bg-white/10 no-underline transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <i className="fa-solid fa-user-gear mr-2 w-4 text-center text-[#9aa3ad]" /> Profile
                </Link>
                <button
                  type="button"
                  className="block w-full cursor-pointer px-4 py-2.5 text-left text-[0.95rem] text-white hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket mr-2 w-4 text-center text-[#9aa3ad]" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 animate-soft-in cursor-pointer border-0 bg-[rgba(16,24,32,0.5)] p-0 min-[900px]:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          'fixed top-0 left-0 z-[60] flex h-screen w-[min(18rem,86vw)] flex-col border-r border-white/10 text-white transition-transform duration-[220ms] bg-[radial-gradient(ellipse_90%_35%_at_0%_0%,rgba(245,158,11,0.18),transparent_52%),linear-gradient(180deg,#32383f_0%,#262b31_100%)] min-[900px]:sticky min-[900px]:h-screen min-[900px]:w-auto min-[900px]:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="hidden border-b border-white/10 px-5 pt-[1.35rem] pb-[1.15rem] min-[900px]:block">
          <Link
            to={path('/dashboard')}
            className="flex items-center transition-opacity hover:opacity-90"
            title="Go to Dashboard"
          >
            <img
              src={softwareLogo}
              alt="KapadKart"
              className="h-9 w-auto max-w-[11.5rem] object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-[0.85rem] py-3.5 space-y-4" aria-label="Main">
          {/* MAIN */}
          <div>
            <div className="px-3 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400/80">
              Main
            </div>
            <ul className="m-0 list-none p-0 space-y-1">
              <li>
                <SidebarNavLink to={path('/dashboard')} icon="fa-solid fa-gauge-high" label="Dashboard" />
              </li>
            </ul>
          </div>

          {/* OPERATIONS */}
          <div>
            <div className="px-3 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400/80">
              Operations
            </div>
            <ul className="m-0 list-none p-0 space-y-1">
              {isRentalAllowed && (
                <li>
                  <div className="flex items-stretch gap-[0.2rem]">
                    <SidebarParentButton
                      icon="fa-solid fa-calendar-check"
                      label="Rentals"
                      expanded={bookingsOpen}
                      onClick={() => goToMenu('bookings', path('/booking'))}
                    />
                    <button
                      type="button"
                      className={submenuToggleClass}
                      aria-label={bookingsOpen ? 'Collapse Rentals' : 'Expand Rentals'}
                      aria-expanded={bookingsOpen}
                      onClick={() => toggleMenu('bookings')}
                    >
                      <SidebarChevron open={bookingsOpen} />
                    </button>
                  </div>
                  {bookingsOpen && (
                    <ul className={submenuListClass}>
                      <li>
                        <SidebarNavLink to={path('/booking')} end icon="fa-solid fa-list-check" label="All Rentals" sub />
                      </li>
                      <li className="mt-1">
                        <SidebarNavLink to={path('/booking/calendar')} icon="fa-solid fa-calendar-days" label="Availability & Calendar" sub />
                      </li>
                      <li className="mt-1">
                        <SidebarNavLink to={path('/booking/add')} icon="fa-solid fa-calendar-plus" label="New Rental" sub />
                      </li>
                    </ul>
                  )}
                </li>
              )}

              {isSalesAllowed && (
                <li>
                  <div className="flex items-stretch gap-[0.2rem]">
                    <SidebarParentButton
                      icon="fa-solid fa-cash-register"
                      label="Sales"
                      expanded={salesOpen}
                      onClick={() => goToMenu('sales', path('/sales'))}
                    />
                    <button
                      type="button"
                      className={submenuToggleClass}
                      aria-label={salesOpen ? 'Collapse Sales' : 'Expand Sales'}
                      aria-expanded={salesOpen}
                      onClick={() => toggleMenu('sales')}
                    >
                      <SidebarChevron open={salesOpen} />
                    </button>
                  </div>
                  {salesOpen && (
                    <ul className={submenuListClass}>
                      <li>
                        <SidebarNavLink to={path('/sales')} end icon="fa-solid fa-receipt" label="All Sales" sub />
                      </li>
                      <li className="mt-1">
                        <SidebarNavLink to={path('/sales/add')} icon="fa-solid fa-cart-plus" label="New Sale (POS)" sub />
                      </li>
                    </ul>
                  )}
                </li>
              )}

              <li>
                <div className="flex items-stretch gap-[0.2rem]">
                  <SidebarParentButton
                    icon="fa-solid fa-shirt"
                    label="Products"
                    expanded={productsOpen}
                    onClick={() => goToMenu('products', path('/products'))}
                  />
                  <button
                    type="button"
                    className={submenuToggleClass}
                    aria-label={productsOpen ? 'Collapse Products' : 'Expand Products'}
                    aria-expanded={productsOpen}
                    onClick={() => toggleMenu('products')}
                  >
                    <SidebarChevron open={productsOpen} />
                  </button>
                </div>
                {productsOpen && (
                  <ul className={submenuListClass}>
                    <li>
                      <SidebarNavLink to={path('/products')} end icon="fa-solid fa-boxes-stacked" label="All Products" sub />
                    </li>
                    <li className="mt-1">
                      <SidebarNavLink to={path('/products/add')} icon="fa-solid fa-plus" label="Add Product" sub />
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>

          {/* INSIGHTS */}
          <div>
            <div className="px-3 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400/80">
              Insights
            </div>
            <ul className="m-0 list-none p-0 space-y-1">
              <li>
                <div className="flex items-stretch gap-[0.2rem]">
                  <SidebarParentButton
                    icon="fa-solid fa-chart-pie"
                    label="Reports"
                    expanded={reportsOpen}
                    onClick={() => goToMenu('reports', path(isRentalAllowed ? '/reports/rental' : '/reports/sales'))}
                  />
                  <button
                    type="button"
                    className={submenuToggleClass}
                    aria-label={reportsOpen ? 'Collapse Reports' : 'Expand Reports'}
                    aria-expanded={reportsOpen}
                    onClick={() => toggleMenu('reports')}
                  >
                    <SidebarChevron open={reportsOpen} />
                  </button>
                </div>
                {reportsOpen && (
                  <ul className={submenuListClass}>
                    {isRentalAllowed && (
                      <li>
                        <SidebarNavLink
                          to={path('/reports/rental')}
                          icon="fa-solid fa-calendar-check"
                          label="Rental Reports"
                          sub
                        />
                      </li>
                    )}
                    {isSalesAllowed && (
                      <li className={isRentalAllowed ? 'mt-1' : ''}>
                        <SidebarNavLink
                          to={path('/reports/sales')}
                          icon="fa-solid fa-receipt"
                          label="Sales Reports"
                          sub
                        />
                      </li>
                    )}
                    <li className="mt-1">
                      <SidebarNavLink
                        to={path('/reports/performance')}
                        icon="fa-solid fa-chart-line"
                        label="Product Performance"
                        sub
                      />
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>

          {/* ADMINISTRATION */}
          <div>
            <div className="px-3 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400/80">
              Administration
            </div>
            <ul className="m-0 list-none p-0 space-y-1">
              <li>
                <SidebarNavLink
                  to={path('/activity')}
                  end
                  icon="fa-solid fa-clock-rotate-left"
                  label="Activity Log"
                />
              </li>

              <li>
                <div className="flex items-stretch gap-[0.2rem]">
                  <SidebarParentButton
                    icon="fa-solid fa-gear"
                    label="Settings"
                    expanded={settingsOpen}
                    onClick={() => goToMenu('settings', path('/settings/company'))}
                  />
                  <button
                    type="button"
                    className={submenuToggleClass}
                    aria-label={settingsOpen ? 'Collapse Settings' : 'Expand Settings'}
                    aria-expanded={settingsOpen}
                    onClick={() => toggleMenu('settings')}
                  >
                    <SidebarChevron open={settingsOpen} />
                  </button>
                </div>
                {settingsOpen && (
                  <ul className={submenuListClass}>
                    <li>
                      <SidebarNavLink
                        to={path('/settings/company')}
                        icon="fa-solid fa-building"
                        label="Company Profile"
                        sub
                      />
                    </li>
                    <li className="mt-1">
                      <SidebarNavLink
                        to={path('/settings/billing')}
                        icon="fa-solid fa-file-invoice"
                        label="Billing Template"
                        sub
                      />
                    </li>
                    <li className="mt-1">
                      <SidebarNavLink
                        to={path('/settings/brands')}
                        icon="fa-solid fa-tags"
                        label="Brands"
                        sub
                      />
                    </li>
                    <li className="mt-1">
                      <SidebarNavLink
                        to={path('/settings/categories')}
                        icon="fa-solid fa-layer-group"
                        label="Categories"
                        sub
                      />
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>
        </nav>

        <div className="border-t border-white/10 px-4 pt-3.5 pb-4 bg-black/10">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[0.82rem] font-bold text-white truncate">
                {user?.name || companyName || 'Shop Admin'}
              </div>
              <div className="text-[0.72rem] text-slate-400 truncate">
                {user?.email || 'Logged In'}
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Logout"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <i className="fa-solid fa-right-from-bracket text-sm" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-[calc(100dvh-3.4rem)] min-w-0 flex-col bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(245,158,11,0.12),transparent_50%),radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(26,28,30,0.05),transparent_45%),linear-gradient(165deg,#ffffff,var(--color-canvas-bottom))] p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] animate-fade-up min-[900px]:min-h-screen min-[900px]:p-7 min-[900px]:pb-7">
        <div className="min-w-0 flex-1">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
        <footer className="mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-[0.65rem] border-t border-border pt-4 pb-1">
          <p className="m-0 text-[0.85rem] text-text-muted">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-x-[1.15rem] gap-y-[0.85rem]" aria-label="Footer">
            <Link
              to={path('/about-developers')}
              className="text-[0.85rem] font-semibold text-text-secondary no-underline transition-colors duration-160 hover:text-accent hover:underline"
            >
              <i className="fa-solid fa-laptop" aria-hidden="true" />
              <span> &nbsp; About Developers</span>
            </Link>
            <Link
              to={path('/contact')}
              className="text-[0.85rem] font-semibold text-text-secondary no-underline transition-colors duration-160 hover:text-accent hover:underline"
            >
              <i className="fa-solid fa-calendar-check" aria-hidden="true" />
              <span> &nbsp; Contact & Meeting</span>
            </Link>
          </nav>
        </footer>
      </main>

      <BottomNav sidebarOpen={sidebarOpen} />
      <PWAInstallBanner />
    </div>
  )
}

export default Layout

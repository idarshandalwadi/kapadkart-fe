import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/admin/auth/AuthContext'
import brandMark from '@/assets/kk-favicon.svg'

function desktopNavClass({ isActive }) {
  return [
    'relative inline-flex items-center gap-2 px-1 py-2 text-sm font-semibold no-underline transition-colors',
    isActive
      ? 'text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent'
      : 'text-ink-soft hover:text-ink',
  ].join(' ')
}

function mobileNavClass({ isActive }) {
  return [
    'flex flex-1 flex-col items-center justify-center min-h-[44px] gap-1 py-2.5 text-[0.72rem] font-semibold no-underline transition-colors',
    isActive ? 'text-accent' : 'text-muted',
  ].join(' ')
}

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      toast.success('Signed out')
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-8">
            <Link to="/admin/dashboard" className="flex shrink-0 items-center gap-3 no-underline">
              <img
                src={brandMark}
                alt="KapadKart"
                className="h-11 w-11 rounded-[0.9rem] shadow-sm"
              />
              <span className="flex flex-col leading-none">
                <span className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-ink">
                  KapadKart <span className="text-accent">Admin</span>
                </span>
                <span className="mt-1.5 text-[0.68rem] font-bold tracking-[0.1em] text-muted uppercase">
                  Platform Admin
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
              <NavLink to="/admin/dashboard" end className={desktopNavClass}>
                <i className="fa-solid fa-chart-pie" aria-hidden="true" />
                Dashboard
              </NavLink>
              <NavLink to="/admin/shops" end className={desktopNavClass}>
                <i className="fa-solid fa-store" aria-hidden="true" />
                Shops
              </NavLink>
              <NavLink to="/admin/shops/new" className={desktopNavClass}>
                <i className="fa-solid fa-circle-plus" aria-hidden="true" />
                Add shop
              </NavLink>
              <NavLink to="/admin/emails" className={desktopNavClass}>
                <i className="fa-solid fa-envelope" aria-hidden="true" />
                Email Logs
              </NavLink>
            </nav>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-3 py-2 min-h-[44px] text-sm font-semibold text-white hover:bg-accent-hover"
          >
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-6xl">
          <NavLink to="/admin/dashboard" end className={mobileNavClass}>
            <i className="fa-solid fa-chart-pie text-[1.15rem]" aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink to="/admin/shops" end className={mobileNavClass}>
            <i className="fa-solid fa-store text-[1.15rem]" aria-hidden="true" />
            Shops
          </NavLink>
          <NavLink to="/admin/shops/new" className={mobileNavClass}>
            <i className="fa-solid fa-circle-plus text-[1.15rem]" aria-hidden="true" />
            Add shop
          </NavLink>
          <NavLink to="/admin/emails" className={mobileNavClass}>
            <i className="fa-solid fa-envelope text-[1.15rem]" aria-hidden="true" />
            Emails
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

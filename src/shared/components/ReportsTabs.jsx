import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useTenant } from '@/shared/tenant/TenantContext'
import { cn } from '@/shared/utils/cn'

export default function ReportsTabs({ className = '' }) {
  const { path, businessType: tenantContextType } = useTenant()
  const { user } = useAuth()
  const businessType = user?.tenant?.businessType || user?.tenant?.business_type || tenantContextType || 'SALES_AND_RENTAL'
  const isRentalAllowed = businessType !== 'SALES'
  const isSalesAllowed = businessType !== 'RENTAL'

  const tabs = [
    ...(isRentalAllowed
      ? [
          {
            key: 'rental',
            label: 'Rental Report',
            to: path('/reports/rental'),
            icon: 'fa-solid fa-calendar-check',
          },
        ]
      : []),
    ...(isSalesAllowed
      ? [
          {
            key: 'sales',
            label: 'Sales Report',
            to: path('/reports/sales'),
            icon: 'fa-solid fa-receipt',
          },
        ]
      : []),
    {
      key: 'performance',
      label: 'Performance',
      to: path('/reports/performance'),
      icon: 'fa-solid fa-chart-line',
    },
  ]

  // If only 1 tab exists, don't show the tab bar
  if (tabs.length <= 1) return null

  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl bg-canvas border border-border/70', className)}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0',
              isActive
                ? 'bg-surface text-accent shadow-sm border border-border/80'
                : 'text-muted hover:text-ink hover:bg-surface/50',
            )
          }
        >
          <i className={cn(tab.icon, 'text-[0.75rem]')} aria-hidden="true" />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </div>
  )
}

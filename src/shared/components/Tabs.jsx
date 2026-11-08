import React from 'react'

/**
 * Reusable Tabs component
 * @param {Array} tabs - [{ id: string, label: string, icon?: string, badge?: string|number, badgeVariant?: 'default'|'accent'|'warn'|'danger' }]
 * @param {string} activeTab - currently selected tab id
 * @param {function} onChange - (tabId) => void
 * @param {string} className - optional extra class for container
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  const badgeColors = {
    default: 'bg-border/60 text-ink-soft',
    accent: 'bg-accent/15 text-accent',
    warn: 'bg-warn-bg text-warn',
    danger: 'bg-danger-bg text-danger',
  }

  return (
    <div className={`border-b border-border/80 ${className}`}>
      <nav
        className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar scroll-smooth"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-semibold transition-all duration-150 cursor-pointer min-h-[44px] ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:border-border hover:text-ink'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && (
                <i
                  className={`fa-solid ${tab.icon} text-sm transition-transform duration-150 ${
                    isActive ? 'text-accent scale-105' : 'text-muted group-hover:text-ink'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
                    badgeColors[tab.badgeVariant || (isActive ? 'accent' : 'default')]
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

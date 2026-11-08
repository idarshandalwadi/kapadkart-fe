import { Link } from 'react-router-dom'

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  iconColor = 'text-accent bg-accent/10',
  to,
  badge,
  badgeVariant = 'ok',
  loading = false,
}) {
  const badgeStyles = {
    ok: 'bg-ok-bg text-ok border-ok/20',
    warn: 'bg-warn-bg text-warn border-warn/20',
    danger: 'bg-danger-bg text-danger border-danger/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
    neutral: 'bg-canvas text-muted border-border',
  }

  const content = (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${iconColor}`}
          >
            <i
              className={`${
                icon.includes(' ')
                  ? icon
                  : icon.startsWith('fa-')
                  ? `fa-solid ${icon}`
                  : `fa-solid fa-${icon}`
              } text-sm`}
              aria-hidden="true"
            />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-border/60" />
        ) : (
          <div className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">
            {value ?? '0'}
          </div>
        )}

        {badge && !loading && (
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.7rem] font-bold ${
              badgeStyles[badgeVariant] || badgeStyles.neutral
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-2 text-xs text-muted">
          {loading ? (
            <div className="h-3.5 w-32 animate-pulse rounded bg-border/50" />
          ) : (
            subtext
          )}
        </div>
      )}

      {to && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-accent opacity-90 transition-all group-hover:opacity-100 group-hover:translate-x-0.5">
          <span>View details</span>
          <i className="fa-solid fa-arrow-right text-[0.65rem]" aria-hidden="true" />
        </div>
      )}
    </div>
  )

  const cardClasses =
    'group block rounded-2xl border border-border/80 bg-surface p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md'

  if (to) {
    return (
      <Link to={to} className={`${cardClasses} no-underline`}>
        {content}
      </Link>
    )
  }

  return <div className={cardClasses}>{content}</div>
}

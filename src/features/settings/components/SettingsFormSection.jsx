import { cn } from '@/shared/utils/cn'

/**
 * Reusable section container for settings forms.
 * Provides a clean title, description, and subtle divider.
 */
function SettingsFormSection({ title, description, children, className = '' }) {
  return (
    <section className={cn('flex flex-col gap-3.5 pt-1 first:pt-0', className)}>
      <div className="flex flex-col gap-0.5 border-b border-border/80 pb-3">
        <h2 className="m-0 font-display text-[1.05rem] sm:text-[1.12rem] font-semibold tracking-[-0.01em] text-text">
          {title}
        </h2>
        {description && (
          <p className="m-0 text-xs sm:text-[0.83rem] text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="pt-1">{children}</div>
    </section>
  )
}

export default SettingsFormSection


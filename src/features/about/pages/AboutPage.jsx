import { useTenant } from '@/shared/tenant/TenantContext'
import { cn } from '@/shared/utils/cn'

function AboutPage() {
  const { companyName } = useTenant()

  return (
    <div className="flex flex-col gap-[1.35rem] max-w-[720px] animate-fade-up">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">{companyName}</p>
          <h1 className="page-title">About Developers</h1>
          <p className="page-lead">
            The team behind this rental management application.
          </p>
        </div>
      </div>

      <section
        className={cn(
          'flex flex-col gap-4 rounded-2xl border border-border px-[1.4rem] py-[1.35rem] shadow-sm',
          'bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.1),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]',
        )}
      >
        <p className="m-0 text-[0.98rem] leading-[1.6] text-text-secondary">
          KapadKart helps clothing rental shops like {companyName} manage inventory,
          bookings, and billing in one place.
        </p>
        <p className="m-0 text-[0.98rem] leading-[1.6] text-text-secondary">
          If you need support with the app or want to discuss improvements, reach out to
          the development team through your store administrator.
        </p>
      </section>
    </div>
  )
}

export default AboutPage

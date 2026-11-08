import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicNavbar from '@/shared/components/PublicNavbar'
import PublicFooter from '@/shared/components/PublicFooter'
import { useAuth as useTenantAuth } from '@/features/auth/context/AuthContext'
import { useAuth as useAdminAuth } from '@/features/admin/auth/AuthContext'
import { tenantPath, getTenantSlug } from '@/shared/tenant/tenant'

export default function HomePage() {
  const tenantAuth = useTenantAuth()
  const adminAuth = useAdminAuth()
  const slug = getTenantSlug()
  const [activeTab, setActiveTab] = useState('all')

  const isAdmin = Boolean(adminAuth?.authenticated && adminAuth?.adminUser)
  const isTenant = Boolean(tenantAuth?.isAuthenticated && tenantAuth?.user)

  const comparisonPoints = [
    {
      title: 'Booking & Wedding Clashes',
      problem: 'Handwritten diaries and paper notes lead to disastrous double-bookings when multiple staff take bookings over phone or WhatsApp during peak wedding seasons.',
      solution: 'Atomic Calendar Engine: Garments are locked for exact date intervals including buffer days. Real-time availability validation prevents overlaps instantly.',
      badge: 'Zero Clashes',
      icon: 'fa-calendar-check',
    },
    {
      title: 'Security Deposit Disputes',
      problem: 'Cash envelopes and loose paper chits cause confusion over how much deposit was collected, missing receipts, and arguments over damage deductions.',
      solution: 'Automated Deposit Ledger: Track exact cash/UPI deposits, log inspection damage with notes, compute overdue fines, and generate instant digital refund settlement slips.',
      badge: 'Transparent Ledger',
      icon: 'fa-shield-halved',
    },
    {
      title: 'Alterations & Fitting Deadlines',
      problem: 'Sticky notes pinned to outfits get lost. Brides arrive for wedding trials only to find the blouse unstitched or measurements forgotten.',
      solution: 'Milestone Alteration Pipeline: Automatically calculates trial dates before the event, stores precise customer measurements, and tracks master tailor progress.',
      badge: 'Timely Trials',
      icon: 'fa-scissors',
    },
    {
      title: 'Dry Cleaning & Turnaround Lag',
      problem: 'Returned bridal garments pile up in backrooms. Staff cannot tell which lehengas are cleaned, in laundry, or ready for this weekend’s dispatch.',
      solution: 'Post-Rental Sanitation Tracker: Outfits transition automatically through Inspection ➔ In Dry Cleaning ➔ Restocked with configurable turnaround buffers.',
      badge: 'Clean Turnaround',
      icon: 'fa-soap',
    },
    {
      title: 'Rental vs. Counter Retail Chaos',
      problem: 'Sales staff accidentally sells a designer outfit off the rack that was already booked for an advance bridal rental next month.',
      solution: 'Unified POS Dual-Availability: Outfits are tagged as Rental, Sale, or Dual. Counter checkout automatically blocks sales if future rental reservations exist.',
      badge: 'Stock Integrity',
      icon: 'fa-cash-register',
    },
    {
      title: 'Item Tracking & Missing Accessories',
      problem: 'Matching dupattas, belts, latkans, and jewelry pieces go missing between rentals without clear checklists or identification.',
      solution: 'SKU & Barcode Tagging: Scan barcode or QR code during pickup and return to verify all bundled items, accessories, and duplicate garments.',
      badge: 'Complete Bundles',
      icon: 'fa-barcode',
    },
  ]

  const featureCards = [
    {
      icon: 'fa-calendar-days',
      title: 'Atomic Reservation Calendar',
      desc: 'Visual timeline showing reserved dates, trial buffer days, and return schedules. Completely prevents double-booking mistakes during peak wedding seasons.',
      tag: 'Calendar Engine',
    },
    {
      icon: 'fa-arrows-spin',
      title: '6-Stage Rental Lifecycle',
      desc: 'Seamlessly tracks garments through Advance Booking ➔ Alteration & Trial ➔ Store Pickup ➔ Event Period ➔ Return Inspection ➔ Dry Cleaning Restocking.',
      tag: 'End-to-End Flow',
    },
    {
      icon: 'fa-receipt',
      title: 'Unified POS & Counter Billing',
      desc: 'Perform multi-day bridal rentals and direct sales in a single bill with barcode scanning, custom discounts, and professional thermal/A4 invoices.',
      tag: 'Instant Checkout',
    },
    {
      icon: 'fa-vault',
      title: 'Deposit & Damage Accounting',
      desc: 'Transparent tracking of security deposits held, damage deductions, overdue penalty calculation, and instant settlement refund slips.',
      tag: 'Financial Safety',
    },
    {
      icon: 'fa-shirt',
      title: 'Garment Master & Dual Images',
      desc: 'Detailed inventory records with size variations, SKU/barcode generation, dual photos (front and back), rental tariffs, and replacement values.',
      tag: 'Inventory Master',
    },
    {
      icon: 'fa-store',
      title: 'Multi-Tenant Cloud Isolation',
      desc: 'Each boutique enjoys complete database isolation, customized receipt templates, staff role permissions, and branded reports.',
      tag: 'Secure Multi-Tenant',
    },
  ]

  const workflowSteps = [
    {
      step: '01',
      title: 'Garment Selection & Date Booking',
      desc: 'Customer selects bridal lehenga, sherwani, or suit. Choose event dates; the atomic calendar validates availability and locks the slot immediately.',
    },
    {
      step: '02',
      title: 'Alteration & Trial Scheduling',
      desc: 'Record customer measurements and schedule fitting trial. The system tracks tailoring milestones so outfits are perfectly fitted on time.',
    },
    {
      step: '03',
      title: 'Dispatch & Security Deposit Collection',
      desc: 'Scan garment barcode, collect security deposit, and generate a clear rental bill with return terms and conditions via print or WhatsApp.',
    },
    {
      step: '04',
      title: 'Event Period & Customer Reminders',
      desc: 'Automated return reminders alert customers ahead of the due date, reducing overdue returns and unexpected delays.',
    },
    {
      step: '05',
      title: 'Return Inspection & Deposit Settlement',
      desc: 'Staff inspects garment for stains or tears. Any damage or overdue fees are deducted transparently and the remaining deposit is refunded.',
    },
    {
      step: '06',
      title: 'Sanitization, Dry Cleaning & Restock',
      desc: 'Garment is sent for laundry/dry cleaning and automatically restored to available stock once fresh and ready for the next customer.',
    },
  ]

  const targetAudiences = [
    {
      name: 'Bridal Couture Boutiques',
      desc: 'Lehengas, designer sarees, bridal gowns, and wedding jewelry sets with multi-week advance reservations.',
      icon: 'fa-gem',
    },
    {
      name: 'Groom & Men’s Formal Wear',
      desc: 'Sherwanis, tuxedos, jodhpuri suits, blazers, and safas with custom alteration tracking.',
      icon: 'fa-user-tie',
    },
    {
      name: 'Festive & Ethnic Attire Houses',
      desc: 'Chaniya choli, Navratri collections, garba costumes, and festive wear during high-volume festival spikes.',
      icon: 'fa-fire-flame-curved',
    },
    {
      name: 'Costume & Studio Wardrobes',
      desc: 'Film, drama, theatre costumes, and themed photoshoot outfits with rapid multi-item checkouts.',
      icon: 'fa-masks-theater',
    },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(245,158,11,0.12),transparent_50%),radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(26,28,30,0.04),transparent_45%),linear-gradient(165deg,var(--color-canvas-top),var(--color-canvas-bottom))] text-text">
      {/* ============================================================== */}
      {/* NAVIGATION BAR                                                 */}
      {/* ============================================================== */}
      <PublicNavbar />

      {/* ============================================================== */}
      {/* HERO SECTION                                                   */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/80 px-3.5 py-1 text-xs font-semibold text-amber-900 shadow-xs">
            <i className="fa-solid fa-crown text-amber-600" aria-hidden="true" />
            <span>Specialized Platform for Bridal &amp; Designer Outfit Rentals</span>
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
            The Smart Way to Manage <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 bg-clip-text text-transparent">
              Fashion &amp; Bridal Rentals.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base text-text-secondary sm:text-lg">
            Say goodbye to paper registers, double-booked wedding dates, and lost security deposits.
            <strong> KapadKart</strong> provides atomic calendar reservation locking, alteration milestones,
            deposit settlement, and counter POS billing in one unified multi-tenant software.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {isAdmin ? (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-accent-hover active:translate-y-px"
              >
                <i className="fa-solid fa-gauge-high" aria-hidden="true" />
                Open Admin Dashboard
              </Link>
            ) : isTenant ? (
              <Link
                to={tenantPath('/dashboard', slug || tenantAuth.user?.tenant?.slug)}
                className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-accent-hover active:translate-y-px"
              >
                <i className="fa-solid fa-gauge-high" aria-hidden="true" />
                Open Store Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-accent-hover active:translate-y-px"
              >
                <i className="fa-solid fa-store" aria-hidden="true" />
                Sign In to Your Store
              </Link>
            )}
            <a
              href="#problem-solution"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-text shadow-xs transition-all hover:border-accent hover:bg-surface-muted"
            >
              <i className="fa-solid fa-scale-balanced text-accent" aria-hidden="true" />
              Traditional vs KapadKart
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-text-secondary shadow-xs transition-all hover:border-accent hover:text-text"
            >
              <i className="fa-solid fa-headset text-muted" aria-hidden="true" />
              Schedule Consultation
            </Link>
          </div>

          {/* Quick Pillars Strip */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface/80 p-4 shadow-xs">
              <div className="text-xl font-bold text-accent">0%</div>
              <div className="mt-0.5 text-xs font-semibold text-text">Booking Clashes</div>
              <div className="text-[0.75rem] text-text-muted">Atomic Calendar Lock</div>
            </div>
            <div className="rounded-xl border border-border bg-surface/80 p-4 shadow-xs">
              <div className="text-xl font-bold text-accent">100%</div>
              <div className="mt-0.5 text-xs font-semibold text-text">Deposit Clarity</div>
              <div className="text-[0.75rem] text-text-muted">Digital Refund Slips</div>
            </div>
            <div className="rounded-xl border border-border bg-surface/80 p-4 shadow-xs">
              <div className="text-xl font-bold text-accent">6-Stage</div>
              <div className="mt-0.5 text-xs font-semibold text-text">Rental Pipeline</div>
              <div className="text-[0.75rem] text-text-muted">Booking to Cleaning</div>
            </div>
            <div className="rounded-xl border border-border bg-surface/80 p-4 shadow-xs">
              <div className="text-xl font-bold text-accent">POS + Rent</div>
              <div className="mt-0.5 text-xs font-semibold text-text">Unified Invoicing</div>
              <div className="text-[0.75rem] text-text-muted">Sell &amp; Rent Together</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* THE CLOTH RENTAL PROBLEM: TRADITIONAL VS KAPADKART             */}
      {/* ============================================================== */}
      <section id="problem-solution" className="border-t border-border/80 bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-bold tracking-wider text-text-muted uppercase">
              The Apparel Rental Dilemma
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Why Traditional Rental Tracking Fails Fashion Businesses
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary sm:text-base">
              Renting bridal lehengas, sherwanis, and luxury outfits is drastically different from normal retail.
              Here is how manual handling breaks down and how KapadKart solves each challenge.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {comparisonPoints.map((item, index) => (
              <div
                key={index}
                className="flex flex-col justify-between rounded-2xl border border-border bg-canvas/40 p-6 shadow-xs transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-accent">
                      <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                    </span>
                    <span className="rounded-full border border-amber-300/80 bg-amber-50/80 px-2.5 py-0.5 text-[0.7rem] font-bold text-amber-900">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-text">{item.title}</h3>

                  {/* Traditional Breakdown */}
                  <div className="mt-4 rounded-xl border border-red-200/80 bg-red-50/60 p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-red-900">
                      <i className="fa-solid fa-triangle-exclamation text-red-600" aria-hidden="true" />
                      <span>Traditional Way (Manual / Diaries)</span>
                    </div>
                    <p className="mt-1 text-red-950/80 leading-relaxed">{item.problem}</p>
                  </div>

                  {/* KapadKart Solution */}
                  <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <i className="fa-solid fa-circle-check text-emerald-600" aria-hidden="true" />
                      <span>KapadKart Solution</span>
                    </div>
                    <p className="mt-1 text-emerald-950/80 leading-relaxed">{item.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* WHAT WE DO: CORE SYSTEM CAPABILITIES                          */}
      {/* ============================================================== */}
      <section id="capabilities" className="border-t border-border/80 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold tracking-wider text-text-muted uppercase">
              Core Capabilities
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Complete Rental &amp; Retail Store Operations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary sm:text-base">
              Everything your boutique needs from customer inquiry to wedding trial, dispatch, return inspection, and deposit refund.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((card, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl border border-border bg-surface p-7 shadow-xs transition-all hover:border-accent hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <i className={`fa-solid ${card.icon} text-lg`} aria-hidden="true" />
                  </span>
                  <span className="text-[0.72rem] font-semibold text-text-muted">
                    {card.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-text">{card.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* HOW IT WORKS: WORKFLOW PIPELINE                                */}
      {/* ============================================================== */}
      <section id="how-it-works" className="border-t border-border/80 bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-bold tracking-wider text-text-muted uppercase">
              Step-by-Step Workflow
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              The 6-Step Garment Rental Lifecycle
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary sm:text-base">
              A structured operational pipeline ensuring bridal outfits are tailored on time, dispatched securely, and sanitized promptly.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-border bg-canvas/40 p-6 shadow-xs"
              >
                <div className="font-display text-3xl font-bold text-accent/30">{step.step}</div>
                <h3 className="mt-2 text-base font-bold text-text">{step.title}</h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* WHO IT'S FOR: BOUTIQUE TYPES                                   */}
      {/* ============================================================== */}
      <section id="audiences" className="border-t border-border/80 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold tracking-wider text-text-muted uppercase">
              Tailored For Fashion Outlets
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Engineered for Every Apparel Rental Business
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary sm:text-base">
              Whether you specialize in exclusive bridal lehengas, men’s tuxedos, or festive ethnic wear, KapadKart scales with your volume.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {targetAudiences.map((aud, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-6 text-center shadow-xs">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-accent">
                  <i className={`fa-solid ${aud.icon} text-lg`} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-text">{aud.name}</h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* CALL TO ACTION BANNER                                          */}
      {/* ============================================================== */}
      <section className="border-t border-border/80 bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Ready to Streamline Your Garment Rental Operations?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-amber-100/90 sm:text-base">
            Join boutique owners eliminating double-bookings, automating fittings, and gaining 100% control over their bridal inventory.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-stone-900 shadow-md transition-all hover:bg-amber-50 active:translate-y-px"
            >
              <i className="fa-solid fa-right-to-bracket text-accent" aria-hidden="true" />
              Sign In to Your Store
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white shadow-xs backdrop-blur-xs transition-all hover:bg-white/20"
            >
              <i className="fa-solid fa-phone" aria-hidden="true" />
              Schedule Store Onboarding
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER                                                         */}
      {/* ============================================================== */}
      <PublicFooter />
    </div>
  )
}

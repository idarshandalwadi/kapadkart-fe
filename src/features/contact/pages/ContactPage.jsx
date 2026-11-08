import { useState, useId } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import PublicNavbar from '@/shared/components/PublicNavbar'
import PublicFooter from '@/shared/components/PublicFooter'
import { scheduleMeeting } from '@/features/contact/api/contact'
import {
  buildWhatsAppMeetingUrl,
  openWhatsAppLink,
} from '@/features/contact/utils/whatsapp'
import {
  SUPPORT_CONFIG,
  buildSupportWhatsAppUrl,
  buildSupportEmailUrl,
  buildSupportTelUrl,
} from '@/config/support'
import { cn } from '@/shared/utils/cn'

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/
const INDIAN_PINCODE_REGEX = /^[1-9]\d{5}$/

const QUICK_TIME_SLOTS = [
  '10:00 AM - 12:00 PM (Morning)',
  '12:00 PM - 02:00 PM (Noon)',
  '02:00 PM - 04:00 PM (Afternoon)',
  '04:00 PM - 06:00 PM (Late Afternoon)',
  '06:00 PM - 08:00 PM (Evening)',
]

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizePhone(val) {
  if (!val) return ''
  let clean = String(val).replace(/[\s\-()]/g, '')
  if (clean.startsWith('+91')) clean = clean.slice(3)
  else if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2)
  else if (clean.startsWith('0') && clean.length === 11) clean = clean.slice(1)
  return clean
}

export default function ContactPage() {
  const location = useLocation()
  const isInsideAppLayout = location.pathname.startsWith('/t/')

  // Parse contextual support reason (?reason=otp | login | password_reset)
  const searchParams = new URLSearchParams(location.search)
  const reasonParam = searchParams.get('reason') || searchParams.get('category') || ''
  const categoryLabel =
    reasonParam === 'otp'
      ? 'OTP Delivery / Verification Issue'
      : reasonParam === 'login'
        ? 'Login / Account Access Issue'
        : reasonParam === 'password_reset'
          ? 'Password Reset Assistance'
          : 'Authentication & Account Support'

  // Unique accessible IDs for form fields
  const fullNameId = useId()
  const phoneId = useId()
  const pincodeId = useId()
  const addressId = useId()
  const meetingDateId = useId()
  const customTimeId = useId()
  const noteId = useId()

  const todayStr = getTodayString()

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    pincode: '',
    address: '',
    meetingDate: todayStr,
    preferredTime: QUICK_TIME_SLOTS[0],
    customTime: '',
    note: '',
    website: '', // Honeypot anti-spam field
  })

  const [useCustomTime, setUseCustomTime] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState(null)
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false)
  const [serverMessage, setServerMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = () => {
    const errs = {}
    const cleanPhone = normalizePhone(formData.phone)

    if (!formData.fullName.trim()) {
      errs.fullName = 'Full Name is required'
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'Full Name must be at least 2 characters'
    }

    if (!formData.address.trim()) {
      errs.address = 'Address is required'
    } else if (formData.address.trim().length < 5) {
      errs.address = 'Please enter a complete address (minimum 5 characters)'
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone Number is required'
    } else if (!INDIAN_PHONE_REGEX.test(cleanPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210)'
    }

    if (!formData.pincode.trim()) {
      errs.pincode = 'Pincode is required'
    } else if (!INDIAN_PINCODE_REGEX.test(formData.pincode.trim())) {
      errs.pincode = 'Enter a valid 6-digit Indian pincode'
    }

    if (!formData.meetingDate) {
      errs.meetingDate = 'Meeting Date is required'
    } else if (formData.meetingDate < todayStr) {
      errs.meetingDate = 'Meeting Date cannot be in the past'
    }

    const effectiveTime = useCustomTime ? formData.customTime.trim() : formData.preferredTime
    if (!effectiveTime) {
      errs.preferredTime = 'Preferred Meeting Time is required'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors in the form before submitting')
      return
    }

    const cleanPhone = normalizePhone(formData.phone)
    const effectiveTime = useCustomTime ? formData.customTime.trim() : formData.preferredTime

    const payload = {
      fullName: formData.fullName.trim(),
      address: formData.address.trim(),
      phone: cleanPhone,
      pincode: formData.pincode.trim(),
      meetingDate: formData.meetingDate,
      preferredTime: effectiveTime,
      note: formData.note.trim(),
      website: formData.website, // honeypot
    }

    setSubmitting(true)
    setRateLimitExceeded(false)
    setServerMessage('')

    try {
      const res = await scheduleMeeting(payload)
      setSubmittedData({ ...payload, effectiveTime })
      setServerMessage(res.message || 'Meeting request submitted successfully!')
      toast.success('Meeting request sent! Please confirm on WhatsApp.')
    } catch (err) {
      const msg = err.message || 'Failed to submit meeting request'
      setServerMessage(msg)

      if (msg.toLowerCase().includes('limit') || msg.includes('429')) {
        setRateLimitExceeded(true)
        // Store submitted data anyway so user can proceed to WhatsApp without losing inputs
        setSubmittedData({ ...payload, effectiveTime })
        toast.error('Daily email limit reached (5/day). You can still message via WhatsApp!')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setSubmittedData(null)
    setRateLimitExceeded(false)
    setServerMessage('')
    setFormData({
      fullName: '',
      phone: '',
      pincode: '',
      address: '',
      meetingDate: todayStr,
      preferredTime: QUICK_TIME_SLOTS[0],
      customTime: '',
      note: '',
      website: '',
    })
  }

  // Generate WhatsApp URL
  const activeWhatsAppUrl = submittedData
    ? buildWhatsAppMeetingUrl({
        fullName: submittedData.fullName,
        address: submittedData.address,
        phone: submittedData.phone,
        pincode: submittedData.pincode,
        meetingDate: submittedData.meetingDate,
        preferredTime: submittedData.preferredTime,
        note: submittedData.note,
      })
    : buildWhatsAppMeetingUrl({
        fullName: formData.fullName,
        address: formData.address,
        phone: normalizePhone(formData.phone),
        pincode: formData.pincode,
        meetingDate: formData.meetingDate,
        preferredTime: useCustomTime ? formData.customTime : formData.preferredTime,
        note: formData.note,
      })

  return (
    <div
      className={cn(
        'w-full animate-fade-up text-text',
        !isInsideAppLayout &&
          'min-h-screen bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(245,158,11,0.12),transparent_50%),radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(26,28,30,0.04),transparent_45%),linear-gradient(165deg,var(--color-canvas-top),var(--color-canvas-bottom))]',
      )}
    >
      {!isInsideAppLayout && <PublicNavbar />}

      <main className={cn('mx-auto max-w-6xl', !isInsideAppLayout && 'px-4 py-8 md:px-8 lg:py-12')}>
        {/* Quick Authentication / Support Actions */}
        <div className="mb-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent border border-accent/20 mb-1">
                <i className="fa-solid fa-headset" />
                <span>Direct Support Channels</span>
              </div>
              <h2 className="text-xl font-bold text-text">
                Need Help with Login, OTP, or Password Reset?
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Our support team is available {SUPPORT_CONFIG.workingHours}. Choose your preferred contact option:
              </p>
            </div>
            {reasonParam && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <i className="fa-solid fa-circle-info" />
                Topic: {categoryLabel}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Action 1: WhatsApp */}
            <a
              href={buildSupportWhatsAppUrl({ category: categoryLabel })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-100/70 group"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-xs group-hover:scale-105 transition-transform">
                <i className="fa-brands fa-whatsapp text-2xl" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">WhatsApp Chat</div>
                <div className="text-sm font-bold text-emerald-950 truncate">{SUPPORT_CONFIG.phoneDisplay}</div>
                <div className="text-[0.75rem] text-emerald-700 mt-0.5">Instant message support →</div>
              </div>
            </a>

            {/* Action 2: Email */}
            <a
              href={buildSupportEmailUrl({ category: categoryLabel })}
              className="flex items-center gap-3.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 transition-all hover:border-amber-300 hover:bg-amber-100/70 group"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-envelope text-xl" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Email Support</div>
                <div className="text-sm font-bold text-amber-950 truncate">{SUPPORT_CONFIG.email}</div>
                <div className="text-[0.75rem] text-amber-700 mt-0.5">Send prefilled email →</div>
              </div>
            </a>

            {/* Action 3: Telephone */}
            <a
              href={buildSupportTelUrl()}
              className="flex items-center gap-3.5 rounded-xl border border-blue-200/80 bg-blue-50/70 p-4 transition-all hover:border-blue-300 hover:bg-blue-100/70 group"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-phone text-lg" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-800">Call Telephone</div>
                <div className="text-sm font-bold text-blue-950 truncate">{SUPPORT_CONFIG.phoneDisplay}</div>
                <div className="text-[0.75rem] text-blue-700 mt-0.5">Dial support team →</div>
              </div>
            </a>
          </div>
        </div>

        {/* Page Title Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-2">
            <i className="fa-solid fa-handshake-simple" />
            <span>Schedule A Visit & Consultation</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            Contact Us & Schedule Meeting
          </h1>
          <p className="mt-2 text-base text-text-secondary max-w-2xl">
            Book an appointment with the KapadKart team for rental catalog walkthroughs, fitting sessions,
            or custom store onboarding. We look forward to meeting you!
          </p>
        </div>

        {/* Main Grid: Left Info Card + Right Scheduling Form */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Contact Info & Support */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <i className="fa-solid fa-headset text-sm" />
                </span>
                Direct Team Connect
              </h2>

              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                Prefer immediate messaging or a phone call? Connect directly with our team during business hours.
              </p>

              <div className="space-y-4">
                {/* WhatsApp Item */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-xs">
                    <i className="fa-brands fa-whatsapp text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-emerald-800">WhatsApp Support</div>
                    <div className="text-sm font-bold text-emerald-950 mt-0.5">{SUPPORT_CONFIG.phoneDisplay}</div>
                    <a
                      href={buildSupportWhatsAppUrl({ category: categoryLabel })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      <span>Open chat with pre-filled details</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  </div>
                </div>

                {/* Email Item */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface-muted border border-border/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-accent">
                    <i className="fa-solid fa-envelope text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-text-muted">Support Email</div>
                    <div className="text-sm font-semibold text-text mt-0.5 break-all">
                      {SUPPORT_CONFIG.email}
                    </div>
                    <a
                      href={buildSupportEmailUrl({ category: categoryLabel })}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      <span>Send support email</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  </div>
                </div>

                {/* Telephone Item */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface-muted border border-border/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                    <i className="fa-solid fa-phone text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-text-muted">Telephone Support</div>
                    <div className="text-sm font-semibold text-text mt-0.5">
                      {SUPPORT_CONFIG.phoneDisplay}
                    </div>
                    <a
                      href={buildSupportTelUrl()}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      <span>Call our support team</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface-muted border border-border/80">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                    <i className="fa-solid fa-clock text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-text-muted">Business Hours</div>
                    <div className="text-sm font-semibold text-text mt-0.5">
                      {SUPPORT_CONFIG.workingHours}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {SUPPORT_CONFIG.emergencyNote}
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlights List */}
              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  Why Schedule With KapadKart?
                </h3>
                <ul className="space-y-2.5 text-xs text-text-secondary list-none p-0 m-0">
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                    <span>Dedicated fitting & rental booking walkthrough</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                    <span>Instant WhatsApp notification & confirmation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                    <span>In-person store visits or online video demonstrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                    <span>Fast email dispatch (strictly max 5 submissions/IP/day)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Meeting Form or Post-Submission State */}
          <div className="lg:col-span-7">
            {submittedData ? (
              /* Success / Result State */
              <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <i className="fa-solid fa-circle-check text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">
                      {rateLimitExceeded ? 'Daily Limit Reached' : 'Meeting Request Submitted!'}
                    </h2>
                    <p className="text-xs text-text-secondary">
                      {rateLimitExceeded
                        ? 'Email quota for today reached. Please send via WhatsApp below.'
                        : 'Your email notification has been dispatched to kanzariyaparth95@gmail.com.'}
                    </p>
                  </div>
                </div>

                {/* Status Notice */}
                {!rateLimitExceeded ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 text-sm text-emerald-900 flex items-start gap-3">
                    <i className="fa-solid fa-envelope-circle-check text-emerald-600 text-lg mt-0.5" />
                    <div>
                      <p className="font-semibold m-0">Step 1 Completed: Email Delivered</p>
                      <p className="text-xs text-emerald-800 mt-1 m-0">
                        {serverMessage || 'The KapadKart team has received your appointment request via email.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-sm text-amber-900 flex items-start gap-3">
                    <i className="fa-solid fa-triangle-exclamation text-amber-600 text-lg mt-0.5" />
                    <div>
                      <p className="font-semibold m-0">IP Rate Limit Notice</p>
                      <p className="text-xs text-amber-800 mt-1 m-0">
                        {serverMessage ||
                          'You have reached the daily limit of 5 email submissions for this IP (resets midnight IST).'}
                        {' '}Don&apos;t worry — you can confirm and send your meeting request directly on WhatsApp below!
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary Table */}
                <div className="rounded-xl bg-surface-muted border border-border p-5 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                    Meeting Details Summary
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                    <div>
                      <span className="text-xs text-text-muted block">Client Name</span>
                      <strong className="text-text">{submittedData.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Phone</span>
                      <strong className="text-text">+91 {submittedData.phone}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Meeting Date</span>
                      <strong className="text-text">{submittedData.meetingDate}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Preferred Time</span>
                      <strong className="text-text">{submittedData.preferredTime}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Pincode</span>
                      <strong className="text-text">{submittedData.pincode}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-text-muted block">Address</span>
                      <span className="text-text">{submittedData.address}</span>
                    </div>
                    {submittedData.note && (
                      <div className="sm:col-span-2">
                        <span className="text-xs text-text-muted block">Note</span>
                        <span className="text-text italic">{submittedData.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: WhatsApp Action Box */}
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-5 mb-6 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#25D366]/20 text-emerald-800 border border-emerald-500/30 mb-1.5">
                        <i className="fa-brands fa-whatsapp" />
                        <span>Recommended Step 2</span>
                      </div>
                      <h4 className="text-base font-bold text-text m-0">Confirm Your Meeting on WhatsApp</h4>
                      <p className="text-xs text-text-secondary mt-1 mb-0 max-w-md">
                        Click below to launch WhatsApp with your prefilled meeting details. You will be able to review
                        and tap <strong>Send</strong> inside WhatsApp to confirm your slot directly.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="whatsapp-confirm-btn"
                      onClick={() => openWhatsAppLink(activeWhatsAppUrl)}
                      className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#20ba59] active:scale-98 transition-all cursor-pointer"
                    >
                      <i className="fa-brands fa-whatsapp text-lg" />
                      <span>Open WhatsApp Chat</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent-hover underline cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-rotate-left" />
                    <span>Schedule Another Meeting</span>
                  </button>

                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface-muted transition-colors"
                  >
                    <span>Return to Home / Sign In</span>
                    <i className="fa-solid fa-arrow-right text-[10px]" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Active Booking Form */
              <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md">
                <div className="border-b border-border pb-4 mb-6">
                  <h2 className="text-xl font-bold text-text">Meeting Scheduling Form</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Fill in your details below to schedule an appointment with our team.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Honeypot field (hidden from real users) */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website-hp">Leave this field empty</label>
                    <input
                      id="website-hp"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.website}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Section 1: Contact Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <label htmlFor={fullNameId} className="block text-xs font-semibold text-text-secondary mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                          <i className="fa-solid fa-user text-xs" />
                        </span>
                        <input
                          id={fullNameId}
                          name="fullName"
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="e.g. Rahul Sharma"
                          className={cn(
                            'w-full rounded-lg border bg-surface py-2.5 pr-3 pl-9 text-sm text-text transition-all',
                            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
                            errors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-border',
                          )}
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-circle-exclamation text-[10px]" />
                          <span>{errors.fullName}</span>
                        </p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label htmlFor={phoneId} className="block text-xs font-semibold text-text-secondary mb-1.5">
                        Phone Number (Indian) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex rounded-lg border border-border bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                        <span className="inline-flex items-center px-3 border-r border-border text-xs font-medium text-text-muted bg-surface-muted/50 rounded-l-lg select-none">
                          +91
                        </span>
                        <input
                          id={phoneId}
                          name="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="9876543210"
                          maxLength={15}
                          className="w-full bg-transparent py-2.5 px-3 text-sm text-text focus:outline-none"
                        />
                      </div>
                      {errors.phone ? (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-circle-exclamation text-[10px]" />
                          <span>{errors.phone}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-muted mt-1">10-digit mobile number</p>
                      )}
                    </div>

                    {/* Pincode */}
                    <div>
                      <label htmlFor={pincodeId} className="block text-xs font-semibold text-text-secondary mb-1.5">
                        Pincode <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                          <i className="fa-solid fa-map-pin text-xs" />
                        </span>
                        <input
                          id={pincodeId}
                          name="pincode"
                          type="text"
                          required
                          maxLength={6}
                          value={formData.pincode}
                          onChange={handleChange}
                          placeholder="395001"
                          className={cn(
                            'w-full rounded-lg border bg-surface py-2.5 pr-3 pl-9 text-sm text-text transition-all',
                            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
                            errors.pincode ? 'border-rose-400 bg-rose-50/20' : 'border-border',
                          )}
                        />
                      </div>
                      {errors.pincode ? (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-circle-exclamation text-[10px]" />
                          <span>{errors.pincode}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-muted mt-1">6-digit Indian postal code</p>
                      )}
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                      <label htmlFor={addressId} className="block text-xs font-semibold text-text-secondary mb-1.5">
                        Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          id={addressId}
                          name="address"
                          required
                          rows={2}
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Shop / House No, Street, Landmark, City, State"
                          className={cn(
                            'w-full rounded-lg border bg-surface p-3 text-sm text-text transition-all resize-y',
                            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
                            errors.address ? 'border-rose-400 bg-rose-50/20' : 'border-border',
                          )}
                        />
                      </div>
                      {errors.address && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-circle-exclamation text-[10px]" />
                          <span>{errors.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Meeting Preferences */}
                  <div className="border-t border-border pt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                      <i className="fa-solid fa-calendar-check text-accent" />
                      <span>Meeting Appointment Details</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Meeting Date */}
                      <div>
                        <label htmlFor={meetingDateId} className="block text-xs font-semibold text-text-secondary mb-1.5">
                          Meeting Date <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id={meetingDateId}
                            name="meetingDate"
                            type="date"
                            required
                            min={todayStr}
                            value={formData.meetingDate}
                            onChange={handleChange}
                            className={cn(
                              'w-full rounded-lg border bg-surface py-2.5 px-3 text-sm text-text transition-all',
                              'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
                              errors.meetingDate ? 'border-rose-400 bg-rose-50/20' : 'border-border',
                            )}
                          />
                        </div>
                        {errors.meetingDate && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <i className="fa-solid fa-circle-exclamation text-[10px]" />
                            <span>{errors.meetingDate}</span>
                          </p>
                        )}
                      </div>

                      {/* Time slot preference mode */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                          Preferred Meeting Time <span className="text-rose-500">*</span>
                        </label>

                        {/* Preset Time Slots */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                          {QUICK_TIME_SLOTS.map((slot) => {
                            const isSelected = !useCustomTime && formData.preferredTime === slot
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => {
                                  setUseCustomTime(false)
                                  setFormData((prev) => ({ ...prev, preferredTime: slot }))
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium text-left transition-all cursor-pointer',
                                  isSelected
                                    ? 'border-accent bg-accent/10 text-accent font-semibold shadow-xs ring-1 ring-accent'
                                    : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted',
                                )}
                              >
                                <i
                                  className={cn(
                                    'fa-solid text-xs',
                                    isSelected ? 'fa-circle-dot text-accent' : 'fa-circle text-text-muted/40',
                                  )}
                                />
                                <span>{slot}</span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Option to specify custom time */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setUseCustomTime(!useCustomTime)}
                            className="text-xs font-semibold text-accent hover:text-accent-hover underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <i className="fa-solid fa-clock" />
                            <span>{useCustomTime ? 'Use preset time slots' : 'Or choose specific custom time'}</span>
                          </button>
                        </div>

                        {useCustomTime && (
                          <div className="mt-2.5 max-w-xs">
                            <input
                              id={customTimeId}
                              name="customTime"
                              type="time"
                              value={formData.customTime}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                            />
                          </div>
                        )}

                        {errors.preferredTime && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <i className="fa-solid fa-circle-exclamation text-[10px]" />
                            <span>{errors.preferredTime}</span>
                          </p>
                        )}
                      </div>

                      {/* Optional Note */}
                      <div className="sm:col-span-2">
                        <label htmlFor={noteId} className="block text-xs font-semibold text-text-secondary mb-1.5">
                          Note / Requirements <span className="text-text-muted font-normal">(Optional)</span>
                        </label>
                        <textarea
                          id={noteId}
                          name="note"
                          rows={3}
                          maxLength={1000}
                          value={formData.note}
                          onChange={handleChange}
                          placeholder="Any specific items you want to see (e.g. bridal lehengas, sherwanis, rental software walkthrough)..."
                          className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-text focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none resize-y"
                        />
                        <div className="flex justify-end mt-1">
                          <span className="text-[10px] text-text-muted">
                            {formData.note.length}/1000 characters
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Notice & Buttons */}
                  <div className="pt-2">
                    <p className="text-[11px] text-text-muted mb-4 leading-relaxed">
                      By submitting, your meeting details will be sent to{' '}
                      <strong className="text-text">kanzariyaparth95@gmail.com</strong>. On the next step, you can
                      also confirm directly via WhatsApp with our team at{' '}
                      <strong className="text-text">{SUPPORT_CONFIG.phoneDisplay}</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        id="contact-submit-btn"
                        className={cn(
                          'w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all',
                          'enabled:hover:bg-accent-hover enabled:active:scale-98 cursor-pointer',
                          'disabled:opacity-60 disabled:cursor-not-allowed',
                        )}
                      >
                        {submitting ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            <span>Sending Email Notification…</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-paper-plane" />
                            <span>Schedule Meeting & Send Email</span>
                          </>
                        )}
                      </button>

                      {/* WhatsApp Direct Option */}
                      <button
                        type="button"
                        onClick={() => {
                          if (validate()) {
                            openWhatsAppLink(activeWhatsAppUrl)
                          } else {
                            toast.info('Please fill required fields to generate your meeting message for WhatsApp')
                          }
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-600/50 transition-all cursor-pointer shadow-xs"
                      >
                        <i className="fa-brands fa-whatsapp text-emerald-600 text-lg" />
                        <span>Chat via WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {!isInsideAppLayout && <PublicFooter />}
    </div>
  )
}

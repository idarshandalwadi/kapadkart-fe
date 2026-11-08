import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fetchSettings, updateSettings } from '@/features/settings/api/settings'
import {
  DEFAULT_BILL_TEMPLATE,
  SAMPLE_RENTAL_BILL_FORM,
  SAMPLE_SALE_BILL_FORM,
} from '@/features/settings/constants/billTemplate'
import BookingBillPrint from '@/features/bookings/components/BookingBillPrint'
import SaleBillPrint from '@/features/sell/components/SaleBillPrint'
import { cn } from '@/shared/utils/cn'

function templateToForm(data = {}) {
  return {
    bill_show_logo: data.bill_show_logo !== false,
    bill_show_signature: data.bill_show_signature !== false,
    bill_rental_title: data.bill_rental_title || DEFAULT_BILL_TEMPLATE.bill_rental_title,
    bill_sale_title: data.bill_sale_title || DEFAULT_BILL_TEMPLATE.bill_sale_title,
    bill_header_note: data.bill_header_note || '',
    bill_footer_note: data.bill_footer_note || '',
  }
}

function BillingTemplatePage() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(templateToForm())
  const [previewType, setPreviewType] = useState('rental')
  const [mobileTab, setMobileTab] = useState('edit') // 'edit' | 'preview'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const json = await fetchSettings()
        const data = json.data ?? json
        setSettings(data)
        setForm(templateToForm(data))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const previewSettings = useMemo(
    () => ({
      ...(settings || {}),
      ...form,
    }),
    [settings, form],
  )

  const handleToggle = (name) => {
    setForm((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleReset = () => {
    setForm(templateToForm(DEFAULT_BILL_TEMPLATE))
    toast.info('Template reset to default values. Click "Save Template" to apply.')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const json = await updateSettings({
        bill_show_logo: form.bill_show_logo,
        bill_show_signature: form.bill_show_signature,
        bill_rental_title: form.bill_rental_title.trim() || DEFAULT_BILL_TEMPLATE.bill_rental_title,
        bill_sale_title: form.bill_sale_title.trim() || DEFAULT_BILL_TEMPLATE.bill_sale_title,
        bill_header_note: form.bill_header_note.trim(),
        bill_footer_note: form.bill_footer_note.trim(),
      })
      const data = json.data ?? json
      setSettings(data)
      setForm(templateToForm(data))
      toast.success(json.message || 'Billing template updated successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to update billing template')
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary">
        <i className="fa-solid fa-spinner fa-spin mr-3 text-lg" />
        <span>Loading billing template...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-up max-w-[1440px] mx-auto pb-10">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Business Settings</p>
          <h1 className="page-title text-2xl md:text-3xl font-bold tracking-tight text-text">Billing Template</h1>
          <p className="page-lead text-sm md:text-base text-text-secondary max-w-2xl">
            Customize how your rental and sale invoices appear. Sections like Tax, Accessories, and Security Deposit automatically display whenever their amounts exist.
          </p>
        </div>
      </div>

      {/* Mobile & Tablet Segmented Tab Switcher (< xl) */}
      <div className="flex xl:hidden w-full rounded-xl bg-surface-muted p-1 border border-border shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={cn(
            'flex-1 py-2.5 px-3 text-center text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2',
            mobileTab === 'edit'
              ? 'bg-white text-text shadow-sm border border-border/40'
              : 'text-text-secondary hover:text-text'
          )}
        >
          <i className="fa-solid fa-sliders text-xs" />
          <span>Template Settings</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={cn(
            'flex-1 py-2.5 px-3 text-center text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2',
            mobileTab === 'preview'
              ? 'bg-white text-text shadow-sm border border-border/40'
              : 'text-text-secondary hover:text-text'
          )}
        >
          <i className="fa-solid fa-eye text-xs" />
          <span>Live Bill Preview</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] xl:items-start">
        {/* Left Form: Settings */}
        <form
          className={cn(
            'flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm',
            mobileTab === 'preview' && 'hidden xl:flex'
          )}
          onSubmit={handleSave}
        >
          {/* Show on Bill Options */}
          <section className="bg-surface-muted/40 p-4 rounded-xl border border-border/60">
            <div className="mb-3">
              <h2 className="m-0 text-sm font-bold text-text uppercase tracking-wider text-xs text-text-secondary">
                Show on Bill
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Toggle optional branding and signature elements.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {[
                {
                  name: 'bill_show_logo',
                  label: 'Company logo',
                  desc: 'Show store logo in the invoice header'
                },
                {
                  name: 'bill_show_signature',
                  label: 'Authorized signature line',
                  desc: 'Display signature box at the bottom of the bill'
                },
              ].map((item) => (
                <li key={item.name}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={Boolean(form[item.name])}
                      onChange={() => handleToggle(item.name)}
                      className="size-4.5 mt-0.5 accent-[#d97706] rounded cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {item.desc}
                      </span>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {/* Bill Titles */}
          <section className="flex flex-col gap-3.5">
            <h2 className="m-0 text-sm font-bold text-text uppercase tracking-wider text-xs text-text-secondary">
              Bill Titles
            </h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bill_rental_title" className="text-xs font-semibold text-text">
                Rental bill title
              </label>
              <input
                id="bill_rental_title"
                name="bill_rental_title"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={form.bill_rental_title}
                onChange={handleChange}
                placeholder="Rental Bill"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bill_sale_title" className="text-xs font-semibold text-text">
                Sale bill title
              </label>
              <input
                id="bill_sale_title"
                name="bill_sale_title"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={form.bill_sale_title}
                onChange={handleChange}
                placeholder="Sale Bill"
              />
            </div>
          </section>

          {/* Custom Notes */}
          <section className="flex flex-col gap-3.5">
            <h2 className="m-0 text-sm font-bold text-text uppercase tracking-wider text-xs text-text-secondary">
              Custom Notes
            </h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bill_header_note" className="text-xs font-semibold text-text">
                Header note
              </label>
              <textarea
                id="bill_header_note"
                name="bill_header_note"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-text focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                value={form.bill_header_note}
                onChange={handleChange}
                placeholder="Optional text printed below company details"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bill_footer_note" className="text-xs font-semibold text-text">
                Additional footer note
              </label>
              <textarea
                id="bill_footer_note"
                name="bill_footer_note"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-text focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                value={form.bill_footer_note}
                onChange={handleChange}
                placeholder="Optional message printed above signature"
              />
            </div>
          </section>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border">
            <button
              type="submit"
              className={cn(
                'btn-primary flex-1 sm:flex-initial justify-center py-2 px-5 text-sm font-semibold rounded-lg shadow-sm',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
              disabled={saving}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text transition-colors hover:border-[#f0d19a] hover:bg-accent-soft hover:text-accent-text"
              onClick={handleReset}
              disabled={saving}
            >
              Reset to default
            </button>
          </div>
        </form>

        {/* Right / Tab 2: Live Preview */}
        <section
          className={cn(
            'rounded-2xl border border-border bg-surface-muted/50 p-3 sm:p-5 shadow-xs flex flex-col gap-3',
            mobileTab === 'edit' && 'hidden xl:flex'
          )}
        >
          {/* Live Preview Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <h2 className="m-0 font-display text-base sm:text-lg font-bold tracking-tight text-text">
                Live Preview
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[0.72rem] font-semibold text-text-secondary bg-white rounded-md border border-border">
                {previewType === 'rental' ? 'Rental Format' : 'Sale Format'}
              </span>
            </div>

            {/* Type selector */}
            <div className="inline-flex rounded-lg border border-border bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  previewType === 'rental'
                    ? 'bg-accent-soft text-accent-text font-bold shadow-2xs'
                    : 'bg-transparent text-text-secondary hover:text-text',
                )}
                onClick={() => setPreviewType('rental')}
              >
                Rental Bill
              </button>
              <button
                type="button"
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  previewType === 'sale'
                    ? 'bg-accent-soft text-accent-text font-bold shadow-2xs'
                    : 'bg-transparent text-text-secondary hover:text-text',
                )}
                onClick={() => setPreviewType('sale')}
              >
                Sale Bill
              </button>
            </div>
          </div>

          {/* Interactive invoice wrapper with scroll safety on mobile & tablet */}
          <div className="w-full overflow-x-auto rounded-xl bg-[#f8fafc] border border-border/80 p-2 sm:p-4 shadow-inner">
            <div className="min-w-[320px] max-w-[800px] mx-auto">
              {previewType === 'rental' ? (
                <BookingBillPrint
                  billNo="000001"
                  form={SAMPLE_RENTAL_BILL_FORM}
                  settings={previewSettings}
                  preview
                />
              ) : (
                <SaleBillPrint
                  billNo="000001"
                  form={SAMPLE_SALE_BILL_FORM}
                  settings={previewSettings}
                  preview
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default BillingTemplatePage

import '@/features/bookings/components/BookingBillPrint.css'
import { saleStatusLabel } from '@/features/sell/constants/sales'
import {
  calcLineTotal,
  formatLineItemsSummary,
  parseSelectedProducts,
  roundMoney,
} from '@/features/bookings/utils/bookingLineItems'
import { getBillTemplateConfig } from '@/features/settings/constants/billTemplate'
import BillUpiQr from '@/shared/components/BillUpiQr'
import { resolveBrandAssetUrl } from '@/shared/tenant/tenant'
import { cn } from '@/shared/utils/cn'
import { createPortal } from 'react-dom'

function formatMoney(amount, currency = 'INR') {
  const value = Number(amount)
  if (Number.isNaN(value)) return '—'

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function parseProductImages(imageField) {
  if (!imageField) return []
  if (Array.isArray(imageField)) {
    return imageField.map((s) => String(s || '').trim()).filter(Boolean)
  }
  if (typeof imageField !== 'string') return []
  const trimmed = imageField.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s || '').trim()).filter(Boolean)
      }
    } catch {
      // ignore
    }
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts
  }

  return [trimmed]
}

function selectInvoiceImages(lineItems) {
  const productItemMap = []
  for (const item of lineItems || []) {
    const name = item.product_name || item.name || '—'
    const code = item.product_code || item.code || ''
    const rawImage =
      item.product?.image ||
      item.image ||
      item.product_image ||
      item.image_url ||
      item.product?.image_url ||
      null
    const images = parseProductImages(rawImage)
    if (images.length > 0) {
      productItemMap.push({ name, code, images })
    }
  }

  const selected = []
  for (const prod of productItemMap) {
    if (prod.images.length > 0 && prod.images[0]) {
      selected.push({
        name: prod.name,
        code: prod.code,
        imageUrl: resolveBrandAssetUrl(prod.images[0]),
      })
    }
  }

  const imagePages = []
  for (let i = 0; i < selected.length; i += 4) {
    imagePages.push(selected.slice(i, i + 4))
  }
  return imagePages
}

function SaleBillPrint({ billNo, form, settings, preview = false, sharedUrl = null }) {
  if (!form) return null
  const currency = settings?.currency || 'INR'
  const template = getBillTemplateConfig(settings || {})
  const logoSrc = resolveBrandAssetUrl(settings?.logo_url)
  const effectiveSharedUrl =
    sharedUrl ||
    form?.shared_url ||
    form?.share_url ||
    form?.download_url ||
    (form?.share_token || form?.token
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/bills/download/${form.share_token || form.token}`
      : null)
  const parsed = parseSelectedProducts(form.selected_products)
  const lineItems =
    Array.isArray(form.line_items) && form.line_items.length > 0
      ? form.line_items
      : Array.isArray(form.items) && form.items.length > 0
        ? form.items.map((it, index) => ({
            key: `item-${it.id || it.product_id || index}`,
            product_id: it.product_id,
            product_name: it.product?.product_name || it.product_name || `Product #${it.product_id}`,
            product_code: it.product?.product_code || null,
            image: it.product?.image || it.image || it.product_image || null,
            quantity: it.quantity,
            unit_price: it.unit_price ?? 0,
            line_total: it.total_amount || it.quantity * (it.unit_price ?? 0),
          }))
        : parsed.items
  const legacyProducts = lineItems.length ? '' : parsed.legacyText || form.legacy_products || ''

  const computedItemsTotal = (lineItems || []).reduce((acc, it) => {
    const q = Math.max(1, Math.trunc(Number(it.quantity) || 1))
    const p = Math.max(0, Number(it.unit_price) || 0)
    return acc + roundMoney(it.line_total != null ? Number(it.line_total) : q * p)
  }, 0)

  const rawSubtotal =
    form.subtotal !== '' && form.subtotal != null ? Number(form.subtotal) : null
  const itemsSubtotal =
    rawSubtotal != null && !Number.isNaN(rawSubtotal) && rawSubtotal > 0
      ? Math.max(0, roundMoney(rawSubtotal))
      : roundMoney(computedItemsTotal)

  const discountAmount = Math.max(0, Number(form.discount_amount) || 0)
  const isExistingSale = Boolean(form.id || form.bill_no || form.sale_total != null || form.final_amount != null)
  const taxRate = Number(form.tax_rate) || (preview && !isExistingSale ? Number(settings?.tax_rate) || 0 : 0)
  let taxAmount = Math.max(0, Number(form.tax_amount) || 0)

  // In preview mode only (for template designers without an existing sale), calculate preview tax
  if (preview && !isExistingSale && taxRate > 0 && taxAmount === 0 && itemsSubtotal > 0) {
    taxAmount = roundMoney((Math.max(0, itemsSubtotal - discountAmount) * taxRate) / 100)
  }

  const storedFinal =
    form.sale_total != null && form.sale_total !== ''
      ? Number(form.sale_total)
      : form.final_amount != null && form.final_amount !== ''
        ? Number(form.final_amount)
        : null

  // Net final amount: honor persisted sale total for historical records, otherwise calculate
  const finalAmount =
    storedFinal != null && !Number.isNaN(storedFinal) && storedFinal > 0
      ? roundMoney(storedFinal)
      : roundMoney(Math.max(0, itemsSubtotal - discountAmount) + taxAmount)

  const paidAmount =
    form.paid_amount !== '' && form.paid_amount != null
      ? Math.max(0, Number(form.paid_amount))
      : finalAmount

  const imagePages = selectInvoiceImages(lineItems)

  const gstRaw = String(settings?.gst_number || '').trim()
  const hasGstNumber = gstRaw && gstRaw !== '0' && gstRaw.toLowerCase() !== 'null' && gstRaw.toLowerCase() !== 'none'
  const contactLine = [
    settings?.phone_number,
    hasGstNumber ? `GST: ${gstRaw}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const content = (
    <div className={cn('sale-bill-print', preview && 'bill-print-preview')} aria-hidden={!preview}>
      <header className="bill-header">
        <div className="bill-brand">
          {template.showLogo && logoSrc && (
            <img className="bill-logo" src={logoSrc} alt="" />
          )}
          <h1>{settings?.company_name || 'KapadKart'}</h1>
          {settings?.address && <p>{settings.address}</p>}
          {contactLine && <p>{contactLine}</p>}
          {template.headerNote && <p className="bill-header-note">{template.headerNote}</p>}
        </div>
        <div className="bill-meta">
          <p className="bill-title">{template.saleTitle}</p>
          <p>
            <strong>Bill No:</strong> {billNo || '—'}
          </p>
          <p>
            <strong>Date:</strong>{' '}
            {new Date(form.created_at || Date.now()).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
          {form.status && (
            <p>
              <strong>Status:</strong>{' '}
              <span className={cn('bill-status-pill', `bill-status-pill--${String(form.status).toLowerCase()}`)}>
                {saleStatusLabel(form.status) || form.status}
              </span>
            </p>
          )}
        </div>
      </header>

      <section className="bill-section">
        <h2>Customer</h2>
        <div className="bill-grid">
          <p>
            <span>Name</span>
            {form.customer_name || '—'}
          </p>
          <p>
            <span>Phone</span>
            {form.phone_number || '—'}
          </p>
          {form.village_address && (
            <p className="bill-span-2">
              <span>Address</span>
              {form.village_address}
            </p>
          )}
        </div>
      </section>

      <section className="bill-section bill-items-section">
        <h2>Items</h2>
        {lineItems.length > 0 ? (
          <table className="bill-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={item.key || `${item.product_id}-${index}`}>
                  <td>
                    {item.product_name}
                    {item.product_code ? ` (${item.product_code})` : ''}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price, currency)}</td>
                  <td>{formatMoney(calcLineTotal(item.quantity, item.unit_price), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="bill-products">
            <p>{formatLineItemsSummary([], legacyProducts) || '—'}</p>
          </div>
        )}
      </section>

      <section className="bill-section bill-amounts">
        <div className="bill-amounts-panel">
          <h2>Payment Summary</h2>
          <table className="bill-amounts-table">
            <tbody>
              {itemsSubtotal > 0 && (
                <tr>
                  <td>Subtotal</td>
                  <td>{formatMoney(itemsSubtotal, currency)}</td>
                </tr>
              )}
              {discountAmount > 0 && (
                <tr className="bill-discount">
                  <td>Instant Discount</td>
                  <td>-{formatMoney(discountAmount, currency)}</td>
                </tr>
              )}
              {taxAmount > 0 && taxRate > 0 && (
                <tr>
                  <td>Tax ({taxRate}%)</td>
                  <td>{formatMoney(taxAmount, currency)}</td>
                </tr>
              )}
              {Math.abs(finalAmount - paidAmount) < 0.01 && paidAmount > 0 ? (
                <tr className="bill-final">
                  <td>Final / Paid Amount</td>
                  <td>{formatMoney(finalAmount, currency)}</td>
                </tr>
              ) : (
                <>
                  <tr className="bill-final">
                    <td>Final Amount</td>
                    <td>{formatMoney(finalAmount, currency)}</td>
                  </tr>
                  {paidAmount > 0 && (
                    <tr className="bill-paid">
                      <td>Paid Amount</td>
                      <td>{formatMoney(paidAmount, currency)}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        <BillUpiQr
          upiId={settings?.upi_id}
          payeeName={settings?.company_name}
          amount={finalAmount}
          hint="Scan & Pay via UPI"
          billNo={billNo}
          currency={currency}
          allowSample={preview}
          whatsappUrl={settings?.whatsapp_url}
          instagramLink={settings?.instagram_link}
          facebookUrl={settings?.facebook_url}
        />
      </section>

      {form.notes && (
        <section className="bill-section">
          <h2>Notes</h2>
          <p className="bill-notes">{form.notes}</p>
        </section>
      )}

      {settings?.terms_and_conditions && (
        <section className="bill-section bill-terms">
          <h2>Terms & Conditions</h2>
          <p>{settings.terms_and_conditions}</p>
        </section>
      )}

      {template.footerNote && (
        <section className="bill-section">
          <p className="bill-footer-note">{template.footerNote}</p>
        </section>
      )}

      <footer className="bill-footer">
        <div className="bill-footer-left">
          <p className="bill-footer-thankyou">
            Thank you for choosing {settings?.company_name || 'KapadKart'}.
          </p>
          {settings?.phone_number && (
            <p className="bill-footer-contact">Contact: {settings?.phone_number}</p>
          )}
        </div>
        {template.showSignature && (
          <div className="bill-sign">
            <span>Authorized Signature</span>
          </div>
        )}
      </footer>

      {/* KapadKart Software Advertisement Footer */}
      <div className="bill-software-branding">
        <div className="bill-software-branding-left">
          <span className="bill-software-badge">K</span>
          <span className="bill-software-title">Powered by KapadKart</span>
          <span className="bill-software-tagline">— Smart Rental &amp; Retail Software • www.kapadkart.in</span>
        </div>
        {effectiveSharedUrl && (
          <div className="bill-software-branding-right">
            <span className="bill-digital-link-label">Digital Bill:</span>
            <span className="bill-digital-link-url">{effectiveSharedUrl}</span>
          </div>
        )}
      </div>

      {imagePages.length > 0 &&
        imagePages.map((pageImgs, pageIdx) => {
          const gridClass =
            pageImgs.length === 1
              ? 'bill-product-images-grid--single'
              : pageImgs.length === 2
                ? 'bill-product-images-grid--double'
                : 'bill-product-images-grid--quad'

          return (
            <div key={`img-page-${pageIdx}`} className="bill-product-images-page">
              <div className="bill-product-images-header">
                <div className="bill-product-images-title-wrap">
                  <h2>Attached Product Images</h2>
                  {imagePages.length > 1 && (
                    <span className="bill-product-images-badge">
                      {pageIdx + 1} / {imagePages.length}
                    </span>
                  )}
                </div>
                <span className="bill-product-images-meta">Bill No: {billNo || '—'}</span>
              </div>
              <div className={cn('bill-product-images-grid', gridClass)}>
                {pageImgs.map((img, i) => (
                  <div key={`img-${i}`} className="bill-product-image-card">
                    <div className="bill-product-image-wrapper">
                      <img src={img.imageUrl} alt={img.name} />
                    </div>
                    <div className="bill-product-image-info">
                      <p className="bill-product-image-title">{img.name}</p>
                      {img.code && <span className="bill-product-image-code">{img.code}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bill-software-branding">
                <div className="bill-software-branding-left">
                  <span className="bill-software-badge">K</span>
                  <span className="bill-software-title">Powered by KapadKart</span>
                  <span className="bill-software-tagline">— Smart Rental &amp; Retail Software • www.kapadkart.in</span>
                </div>
                {effectiveSharedUrl && (
                  <div className="bill-software-branding-right">
                    <span className="bill-digital-link-label">Digital Bill:</span>
                    <span className="bill-digital-link-url">{effectiveSharedUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
    </div>
  )

  if (preview) return content
  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}

export default SaleBillPrint

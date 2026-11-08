import './BookingBillPrint.css'
import { bookingStatusLabel } from '@/features/bookings/constants/bookings'
import {
  buildBillAccessoryFields,
  formatItemAccessories,
  calcLineTotal,
  formatLineItemsSummary,
  normalizeRentalDays,
  parseSelectedProducts,
  roundMoney,
  resolvePayableAmounts,
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

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  if (productItemMap.length >= 4) {
    for (const prod of productItemMap) {
      if (prod.images.length > 0) {
        selected.push({
          name: prod.name,
          code: prod.code,
          imageUrl: resolveBrandAssetUrl(prod.images[0]),
        })
      }
    }
  } else if (productItemMap.length > 0) {
    for (const prod of productItemMap) {
      if (prod.images.length > 0) {
        selected.push({
          name: prod.name,
          code: prod.code,
          imageUrl: resolveBrandAssetUrl(prod.images[0]),
        })
      }
    }

    let imgIdx = 1
    let addedAny = true
    while (selected.length < 4 && addedAny) {
      addedAny = false
      for (const prod of productItemMap) {
        if (selected.length >= 4) break
        if (prod.images.length > imgIdx) {
          selected.push({
            name: prod.name,
            code: prod.code,
            imageUrl: resolveBrandAssetUrl(prod.images[imgIdx]),
          })
          addedAny = true
        }
      }
      imgIdx++
    }
  }

  const imagePages = []
  for (let i = 0; i < selected.length; i += 4) {
    imagePages.push(selected.slice(i, i + 4))
  }
  return imagePages
}

function BookingBillPrint({ billNo, form, settings, preview = false, sharedUrl = null }) {
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
  const rentalDays = normalizeRentalDays(
    form.rental_days ?? parseSelectedProducts(form.selected_products).rentalDays ?? 1,
  )
  const subtotal =
    form.subtotal !== '' && form.subtotal != null
      ? Number(form.subtotal)
      : null
  const discountAmount = Number(form.discount_amount) || 0
  const taxRate = Number(form.tax_rate) || Number(settings?.tax_rate) || 0
  const taxAmount = Number(form.tax_amount) || 0
  const securityDeposit = Number(form.security_deposit) || 0
  const paidAmount = Number(form.paid_amount) || 0
  const { finalAmount: rentalTotal, dueAmount } = resolvePayableAmounts({
    subtotal,
    taxAmount,
    discountAmount,
    paidAmount,
    storedFinal: form.rental_total,
  })

  const parsed = parseSelectedProducts(form.selected_products)
  const rawItems =
    Array.isArray(form.line_items) && form.line_items.length > 0
      ? form.line_items
      : Array.isArray(form.items) && form.items.length > 0
        ? form.items
        : parsed.items || []

  const lineItems = rawItems.map((it, index) => {
    const qty = Math.max(1, Number(it.quantity) || 1)
    const unitPrice = Number(it.unit_rent ?? it.unit_price ?? it.price ?? 0)
    const duration = normalizeRentalDays(
      it.rental_days && Number(it.rental_days) > 1
        ? it.rental_days
        : (rentalDays || 1)
    )
    const lineTotal =
      it.total_amount != null && Number(it.total_amount) > 0 && Number(it.total_amount) >= (qty * unitPrice)
        ? Number(it.total_amount)
        : calcLineTotal(qty, unitPrice, duration)

    return {
      key: it.key || `item-${it.id || it.product_id || index}`,
      product_id: it.product_id || it.productId,
      product_name: it.product?.product_name || it.product_name || it.name || `Product #${it.product_id || index + 1}`,
      product_code: it.product?.product_code || it.product_code || null,
      image: it.product?.image || it.image || it.product_image || null,
      quantity: qty,
      unit_price: unitPrice,
      rental_days: duration,
      line_total: lineTotal,
      choyani: it.choyani || it.accessories?.choyani || '',
      pant: it.pant || it.accessories?.pant || '',
      sol: it.sol || it.accessories?.sol || '',
      mojdi: it.mojdi || it.accessories?.mojdi || '',
      other_items: it.other_items || it.accessories?.other_items || it.accessories?.otherItems || '',
    }
  })

  const legacyProducts = lineItems.length ? '' : parsed.legacyText || form.legacy_products || ''

  const imagePages = selectInvoiceImages(lineItems)

  const itemHasOwnAccessories = lineItems.some((item) => formatItemAccessories(item))
  const accessoryFields = itemHasOwnAccessories ? [] : buildBillAccessoryFields(form)
  const accessoriesPrice = Math.max(0, Number(form.accessories_price) || 0)
  const lineItemsSum = lineItems.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0)
  const itemsSubtotal =
    lineItems.length > 0
      ? Math.max(Number(form.subtotal), lineItemsSum)
      : (subtotal != null && !Number.isNaN(subtotal) ? subtotal : 0)

  const gstRaw = String(settings?.gst_number || '').trim()
  const hasGstNumber = gstRaw && gstRaw !== '0' && gstRaw.toLowerCase() !== 'null' && gstRaw.toLowerCase() !== 'none'
  const contactLine = [
    settings?.phone_number,
    hasGstNumber ? `GST: ${gstRaw}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const isPostPickup =
    form.status === 'sent' ||
    form.status === 'picked_up' ||
    form.status === 'partially_returned' ||
    form.status === 'returned' ||
    form.status === 'completed' ||
    Boolean(form.sent_at)

  let qrAmount = 0
  let qrHint = ''

  if (isPostPickup) {
    qrAmount = dueAmount
    qrHint = dueAmount > 0 ? 'Amount pre-filled as due (Baki)' : 'Fully paid'
  } else {
    qrAmount = paidAmount > 0 ? paidAmount : (dueAmount > 0 ? dueAmount : rentalTotal)
    qrHint = paidAmount > 0 ? 'Amount pre-filled as advance (Jama)' : 'Amount pre-filled as total'
  }

  const isDepositPaid = Boolean(form.deposit_paid || form.depositPaid || Number(form.deposit_collected) > 0)
  const depositCollected = isDepositPaid ? (Number(form.deposit_collected) || securityDeposit) : 0
  const depositPending = !isDepositPaid ? securityDeposit : 0
  const depositAdjusted = Number(form.deposit_adjusted) || 0
  const depositRefunded = Number(form.deposit_refunded) || 0
  const penaltyTotal = Number(form.penalty_total) || 0
  const penaltyPaid = Number(form.penalty_paid) || 0
  const isReturnedStatus = form.status === 'returned' || form.status === 'completed'

  const content = (
    <div
      className={cn('booking-bill-print', preview && 'bill-print-preview')}
      aria-hidden={!preview}
    >
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
          <p className="bill-title">{template.rentalTitle}</p>
          <p>
            <strong>Bill No:</strong> {billNo || '—'}
          </p>
          <p>
            <strong>Booking Date:</strong>{' '}
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
                {bookingStatusLabel(form.status) || form.status}
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
          {form.extra_phone_number && (
            <p>
              <span>Alt. Phone</span>
              {form.extra_phone_number}
            </p>
          )}
          {form.village_address && (
            <p className="bill-span-2">
              <span>Address</span>
              {form.village_address}
            </p>
          )}
        </div>
      </section>

      <section className="bill-section">
        <h2>Rental Details</h2>
        <div className="bill-grid">
          <p>
            <span>Pickup Date</span>
            {formatDateTime(form.pickup_date || form.use_date)}
          </p>
          <p>
            <span>Return Date</span>
            {formatDateTime(form.return_date)}
          </p>
          <p>
            <span>Rental Duration</span>
            {rentalDays} {rentalDays === 1 ? 'Day' : 'Days'}
          </p>
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
                <th>Daily Rent</th>
                <th>Days</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={item.key || `${item.product_id}-${index}`}>
                  <td>
                    <div className="bill-item-name-row">
                      <span className="bill-item-name">{item.product_name}</span>
                      {item.product_code && (
                        <span className="bill-item-code"> ({item.product_code})</span>
                      )}
                    </div>
                    {buildBillAccessoryFields(item).length > 0 && (
                      <div className="bill-item-accessories-box">
                        <span className="bill-accessories-heading">Included:</span>
                        <div className="bill-accessories-chips">
                          {buildBillAccessoryFields(item).map((acc) => (
                            <span key={acc.key} className="bill-accessory-chip">
                              <span className="bill-accessory-tag">{acc.label}:</span>
                              <span className="bill-accessory-val">{acc.value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price, currency)}</td>
                  <td>{item.rental_days || rentalDays}</td>
                  <td>{formatMoney(item.line_total, currency)}</td>
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

      {template.showAccessories && accessoryFields.length > 0 && (
        <section className="bill-section bill-accessories">
          <h2>Accessories</h2>
          <div className="bill-grid bill-accessories-grid">
            {accessoryFields.map((item) => (
              <p key={item.key}>
                <span>{item.label}</span>
                {item.value}
              </p>
            ))}
          </div>
        </section>
      )}

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
              {accessoriesPrice > 0 && (
                <tr>
                  <td>Accessories</td>
                  <td>{formatMoney(accessoriesPrice, currency)}</td>
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
              <tr className="bill-final">
                <td>Base Rental Total</td>
                <td>{formatMoney(rentalTotal, currency)}</td>
              </tr>
              {penaltyTotal > 0 && (
                <tr className="bill-penalty">
                  <td>Penalties / Late / Damage</td>
                  <td>+{formatMoney(penaltyTotal, currency)}</td>
                </tr>
              )}
              {depositAdjusted > 0 && (
                <tr className="bill-discount">
                  <td>Deposit Adjusted</td>
                  <td>-{formatMoney(depositAdjusted, currency)}</td>
                </tr>
              )}
              {paidAmount > 0 && (
                <tr className="bill-paid">
                  <td>Rent Paid (Jama)</td>
                  <td>{formatMoney(paidAmount, currency)}</td>
                </tr>
              )}
              {penaltyPaid > 0 && (
                <tr className="bill-paid">
                  <td>Penalty Paid</td>
                  <td>{formatMoney(penaltyPaid, currency)}</td>
                </tr>
              )}
              {isReturnedStatus ? (
                <>
                  {depositRefunded > 0 && (
                    <tr className="bill-deposit-refund">
                      <td>Deposit Refunded</td>
                      <td>{formatMoney(depositRefunded, currency)}</td>
                    </tr>
                  )}
                  <tr className="bill-settled font-semibold">
                    <td>Settlement Status</td>
                    <td className="text-success-text">Fully Settled (₹0.00 Due)</td>
                  </tr>
                </>
              ) : (
                <>
                  {dueAmount > 0 && (
                    <tr className="bill-due">
                      <td>Remaining Rent Due (Baki)</td>
                      <td>{formatMoney(dueAmount, currency)}</td>
                    </tr>
                  )}
                  {depositCollected > 0 && (
                    <tr className="bill-deposit font-semibold text-emerald-700">
                      <td>Security Deposit Held</td>
                      <td>{formatMoney(depositCollected, currency)}</td>
                    </tr>
                  )}
                  {depositPending > 0 && (
                    <>
                      <tr className="bill-penalty font-semibold text-amber-700">
                        <td>Security Deposit (Pending)</td>
                        <td>{formatMoney(depositPending, currency)}</td>
                      </tr>
                      {dueAmount + depositPending > 0 && (
                        <tr className="bill-due font-bold text-amber-800 bg-amber-50">
                          <td>Total Due at Pickup</td>
                          <td>{formatMoney(dueAmount + depositPending, currency)}</td>
                        </tr>
                      )}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        <BillUpiQr
          upiId={settings?.upi_id}
          payeeName={settings?.company_name}
          amount={qrAmount}
          hint={qrHint}
          billNo={billNo}
          currency={currency}
          allowSample={preview}
          whatsappUrl={settings?.whatsapp_url}
          instagramLink={settings?.instagram_link}
          facebookUrl={settings?.facebook_url}
        />
      </section>

      {template.showSecurityDeposit && securityDeposit > 0 && (
        <section className="bill-section bill-deposit-note">
          {isDepositPaid ? (
            <>
              <p className="font-medium text-slate-800">
                Security deposit of {formatMoney(securityDeposit, currency)} is held separately and is not included in this bill.
              </p>
              <p className="bill-deposit-note-gujarati text-[0.82rem] text-slate-600 mt-0.5">
                {formatMoney(securityDeposit, currency)} ની સિક્યોરિટી ડિપોઝિટ અલગથી રાખવામાં આવે છે અને તે આ બિલમાં શામેલ નથી.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-amber-900">
                Security deposit of {formatMoney(securityDeposit, currency)} is pending and must be paid at pickup/handover.
              </p>
              <p className="bill-deposit-note-gujarati text-[0.82rem] text-amber-700 mt-0.5">
                {formatMoney(securityDeposit, currency)} ની સિક્યોરિટી ડિપોઝિટ બાકી છે અને પીકઅપ/ડિલિવરી વખતે ચૂકવવાની રહેશે.
              </p>
            </>
          )}
        </section>
      )}

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

export default BookingBillPrint

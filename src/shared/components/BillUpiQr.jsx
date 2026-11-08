import { QRCodeSVG } from 'qrcode.react'
import { buildUpiPaymentUri, extractUpiVpa } from '@/shared/utils/upiPayment'
import { cn } from '@/shared/utils/cn'

export const SAMPLE_UPI_ID = 'sample@upi'

function socialLinksFromSettings(whatsappUrl, instagramLink, facebookUrl) {
  return [
    String(whatsappUrl ?? '').trim() && {
      key: 'whatsapp',
      label: 'WhatsApp',
      url: String(whatsappUrl).trim(),
    },
    String(instagramLink ?? '').trim() && {
      key: 'instagram',
      label: 'Instagram',
      url: String(instagramLink).trim(),
    },
    String(facebookUrl ?? '').trim() && {
      key: 'facebook',
      label: 'Facebook',
      url: String(facebookUrl).trim(),
    },
  ].filter(Boolean)
}

function SocialQr({ label, url, size }) {
  return (
    <div className="bill-social-qr">
      <div className="bill-upi-qr bill-social-qr-code">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#111111"
          marginSize={2}
          title={`${label} QR`}
        />
      </div>
      <p className="bill-upi-label">{label}</p>
    </div>
  )
}

/**
 * UPI QR + VPA text for rental/sale bills.
 * WhatsApp/Instagram/Facebook QRs sit on the right when those URLs are set in company settings.
 */
function BillUpiQr({
  upiId,
  payeeName,
  amount,
  billNo,
  currency = 'INR',
  size = 112,
  socialSize = 80,
  allowSample = false,
  whatsappUrl,
  instagramLink,
  facebookUrl,
  hint = null,
}) {
  const configuredId = String(upiId ?? '').trim()
  const effectiveId = configuredId || (allowSample ? SAMPLE_UPI_ID : '')
  const usingSample = !configuredId && allowSample
  const vpa = extractUpiVpa(effectiveId)
  const uri = buildUpiPaymentUri({
    upiId: effectiveId,
    payeeName: payeeName || 'Merchant',
    amount,
    billNo,
    currency,
  })
  const socials = socialLinksFromSettings(whatsappUrl, instagramLink, facebookUrl)
  const hasSocials = socials.length > 0

  const due = Number(amount)
  const hasAmount = Number.isFinite(due) && due > 0

  if (!effectiveId && !hasSocials && !allowSample) {
    return null
  }

  let payContent = null
  if (!effectiveId) {
    if (allowSample) {
      payContent = (
        <div className="bill-upi-meta">
          <p className="bill-upi-label">UPI QR</p>
          <p className="bill-upi">
            Add a merchant UPI ID in <strong>Company Settings</strong> to show the payment QR on
            bills.
          </p>
        </div>
      )
    }
  } else if (!uri || !vpa) {
    if (allowSample) {
      payContent = (
        <div className="bill-upi-meta">
          <p className="bill-upi-label">UPI QR</p>
          <p className="bill-upi">
            Invalid UPI ID. Use a VPA like <strong>shop@oksbi</strong>.
          </p>
        </div>
      )
    } else if (!hasSocials) {
      return null
    }
  } else {
    payContent = (
      <>
        <div className="bill-upi-qr">
          <QRCodeSVG
            value={uri}
            size={size}
            level="M"
            bgColor="#ffffff"
            fgColor="#111111"
            marginSize={2}
            title={`UPI payment QR for ${vpa}`}
          />
        </div>
        <div className="bill-upi-meta">
          <p className="bill-upi-label">Scan to pay (UPI)</p>
          <p className="bill-upi">
            <strong>UPI:</strong> {vpa}
          </p>
          {hint ? (
            <p className="bill-upi-amount-hint">{hint}</p>
          ) : (
            hasAmount && <p className="bill-upi-amount-hint">Amount pre-filled as due</p>
          )}
          {usingSample && !hint && (
            <p className="bill-upi-amount-hint">Sample QR — set your UPI ID in Company Settings</p>
          )}
        </div>
      </>
    )
  }

  if (!payContent && !hasSocials) {
    return null
  }

  return (
    <div
      className={cn(
        'bill-upi-block',
        (!effectiveId || !uri || !vpa) && 'bill-upi-missing',
        hasSocials && 'bill-upi-block-with-social',
      )}
    >
      {payContent && <div className="bill-upi-pay">{payContent}</div>}
      {hasSocials && (
        <div className="bill-social-qrs">
          {socials.map((item) => (
            <SocialQr key={item.key} label={item.label} url={item.url} size={socialSize} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BillUpiQr

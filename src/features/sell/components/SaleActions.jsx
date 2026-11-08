import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { createSaleShareLink } from '@/features/sell/api/sales'
import { API_BASE_URL } from '@/config/api'
import { useTenant } from '@/shared/tenant/TenantContext'
import { buildSaleWhatsAppMessage, openWhatsAppShare } from '@/shared/utils/whatsappShare'
import { isSaleEditable, isSaleCancellable } from '@/features/sell/constants/sales'
import { cn } from '@/shared/utils/cn'

const iconBtnClass =
  'inline-flex items-center justify-center size-8 rounded-lg border border-transparent text-[0.9rem] cursor-pointer transition-[background-color,border-color,color,transform] duration-160 disabled:cursor-not-allowed disabled:opacity-50'

function SaleActions({
  sale,
  onViewSale,
  onPrintBill,
  onCancel,
  onShare,
  printing,
  cancelling,
  companyName,
  showEdit = true,
}) {
  const { path, companyName: tenantCompanyName, branding } = useTenant()
  const isCancelled = sale.status === 'cancelled'
  const canEdit = isSaleEditable(sale)
  const canCancel = isSaleCancellable(sale)
  const [sharing, setSharing] = useState(false)
  const shopName = companyName || tenantCompanyName || 'KapadKart'

  const handleShare = async (e) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (onShare) {
      onShare(sale)
      return
    }

    const shareWindow = window.open('about:blank', '_blank')
    if (!shareWindow) {
      toast.error('Please allow pop-ups to share on WhatsApp.')
      return
    }

    setSharing(true)
    try {
      const { download_path: downloadPath } = await createSaleShareLink(sale.id)
      const apiBase = String(API_BASE_URL || '').replace(/\/$/, '')
      const downloadUrl = new URL(`${apiBase}${downloadPath}`, window.location.origin).href
      openWhatsAppShare({
        phone: sale.phone_number,
        targetWindow: shareWindow,
        message: buildSaleWhatsAppMessage(sale, shopName, {
          downloadUrl,
          contactNumber: branding?.phone_number || '',
        }),
      })
    } catch (err) {
      shareWindow.close()
      toast.error(err.message || 'Could not create the bill download link')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-[0.35rem]">
      {onViewSale && (
        <button
          type="button"
          title="View Details"
          aria-label="View Details"
          className={cn(
            iconBtnClass,
            'border-border bg-white text-text hover:bg-surface-muted hover:border-border-strong',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onViewSale(sale)
          }}
        >
          <i className="fa-solid fa-eye" aria-hidden="true" />
        </button>
      )}

      {showEdit && !isCancelled && (
        canEdit ? (
          <Link
            to={path(`/sales/${sale.id}/edit`)}
            state={{ sale }}
            title="Edit Sale"
            aria-label="Edit Sale"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              iconBtnClass,
              'border-[#f0d19a] bg-accent-soft text-accent-text hover:bg-[#fbd9a5]',
            )}
          >
            <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Editing is no longer allowed after 30 days from sale date"
            aria-label="Editing is no longer allowed after 30 days from sale date"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              iconBtnClass,
              'border-border/60 bg-surface-muted/70 text-text-muted cursor-not-allowed opacity-40',
            )}
          >
            <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
          </button>
        )
      )}

      {onPrintBill && (
        <button
          type="button"
          title="Print Bill"
          aria-label="Print Bill"
          className={cn(
            iconBtnClass,
            'border-border bg-white text-text hover:bg-surface-muted hover:border-border-strong',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onPrintBill(sale)
          }}
          disabled={printing}
        >
          {printing ? (
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
          ) : (
            <i className="fa-solid fa-print" aria-hidden="true" />
          )}
        </button>
      )}

      <button
        type="button"
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
        className={cn(
          iconBtnClass,
          'border-[#b7e4c7] bg-[#ecfdf3] text-[#15803d] hover:bg-[#dcfce7]',
        )}
        onClick={handleShare}
        disabled={sharing}
      >
        {sharing ? (
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        ) : (
          <i className="fa-brands fa-whatsapp" aria-hidden="true" />
        )}
      </button>

      {!isCancelled && onCancel && (
        canCancel ? (
          <button
            type="button"
            title="Cancel Sale"
            aria-label="Cancel Sale"
            className={cn(
              iconBtnClass,
              'border-[#fecaca] bg-danger-bg text-danger-text enabled:hover:bg-[#fee2e2]',
            )}
            onClick={(e) => {
              e.stopPropagation()
              onCancel(sale)
            }}
            disabled={cancelling}
          >
            {cancelling ? (
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            ) : (
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Cancellation is no longer allowed after 45 days from sale date"
            aria-label="Cancellation is no longer allowed after 45 days from sale date"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              iconBtnClass,
              'border-border/60 bg-surface-muted/70 text-text-muted cursor-not-allowed opacity-40',
            )}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  )
}

export default SaleActions

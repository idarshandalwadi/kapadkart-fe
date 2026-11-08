import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { createBookingShareLink } from '@/features/bookings/api/bookings'
import { getBookingAvailableActions } from '@/features/bookings/constants/bookings'
import { API_BASE_URL } from '@/config/api'
import { useTenant } from '@/shared/tenant/TenantContext'
import {
  buildBookingWhatsAppMessage,
  openWhatsAppShare,
} from '@/shared/utils/whatsappShare'
import { cn } from '@/shared/utils/cn'

const iconBtnClass =
  'inline-flex items-center justify-center size-8 rounded-lg border border-transparent text-[0.85rem] cursor-pointer transition-[background-color,border-color,color,transform] duration-160 disabled:cursor-not-allowed disabled:opacity-50'

function BookingActions({
  booking,
  onPrintBill,
  onSend,
  onProcessReturn,
  onDelete,
  onViewBooking,
  printing,
  deleting,
}) {
  const { path, companyName, branding } = useTenant()
  const [sharing, setSharing] = useState(false)

  const { canSend, canEdit, canDelete, canReturn, canPrint, canWhatsApp } =
    getBookingAvailableActions(booking)

  const handleShare = async () => {
    const shareWindow = window.open('about:blank', '_blank')
    if (!shareWindow) {
      toast.error('Please allow pop-ups to share on WhatsApp.')
      return
    }

    setSharing(true)
    try {
      const { download_path: downloadPath } = await createBookingShareLink(booking.id)
      const apiBase = String(API_BASE_URL || '').replace(/\/$/, '')
      const downloadUrl = new URL(`${apiBase}${downloadPath}`, window.location.origin).href
      openWhatsAppShare({
        phone: booking.phone_number,
        targetWindow: shareWindow,
        message: buildBookingWhatsAppMessage(booking, companyName, {
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
    <div className="flex flex-wrap items-center gap-[0.3rem]">
      {/* View Details Action */}
      {onViewBooking && (
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
            onViewBooking(booking)
          }}
        >
          <i className="fa-solid fa-eye" aria-hidden="true" />
        </button>
      )}

      {/* Dispatch / Handover Action: enabled for reserved / undispatched bookings */}
      {canSend && onSend && (
        <button
          type="button"
          title="Dispatch / Mark as Picked Up"
          aria-label="Dispatch / Mark as Picked Up"
          className={cn(
            iconBtnClass,
            'border-blue-600/40 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSend(booking)
          }}
        >
          <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" />
        </button>
      )}

      {/* Return Action: only visible when rental is active, overdue, or partially returned */}
      {canReturn && onProcessReturn && (
        <button
          type="button"
          title="Process Return"
          aria-label="Process Return"
          className={cn(
            iconBtnClass,
            'border-purple-600/40 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:text-purple-400',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onProcessReturn(booking)
          }}
        >
          <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true" />
        </button>
      )}

      {/* Edit Action: enabled for future bookings only */}
      {canEdit ? (
        <Link
          to={path(`/booking/${booking.id}/edit`)}
          state={{ booking }}
          title="Edit Booking"
          aria-label="Edit Booking"
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
          title="Editing is disabled for active, overdue, or completed bookings"
          aria-label="Edit Booking (disabled)"
          className={cn(
            iconBtnClass,
            'border-[#f0d19a] bg-accent-soft text-accent-text',
          )}
          disabled
        >
          <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
        </button>
      )}

      {/* Print Bill Action */}
      {canPrint && (
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
            onPrintBill?.(booking)
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

      {/* WhatsApp Share Action */}
      {canWhatsApp && (
        <button
          type="button"
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
          className={cn(
            iconBtnClass,
            'border-[#b7e4c7] bg-[#ecfdf3] text-[#15803d] hover:bg-[#dcfce7]',
          )}
          onClick={(e) => {
            e.stopPropagation()
            handleShare()
          }}
          disabled={sharing}
        >
          {sharing ? (
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
          ) : (
            <i className="fa-brands fa-whatsapp" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Delete Action: enabled for future bookings only */}
      {onDelete && (
        <button
          type="button"
          title={canDelete ? 'Delete Booking' : 'Delete is disabled for active, overdue, or completed bookings'}
          aria-label={canDelete ? 'Delete Booking' : 'Delete Booking (disabled)'}
          className={cn(
            iconBtnClass,
            'border-[#fecaca] bg-danger-bg text-danger-text enabled:hover:bg-[#fee2e2]',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(booking)
          }}
          disabled={!canDelete || deleting}
        >
          {deleting ? (
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
          ) : (
            <i className="fa-solid fa-trash" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  )
}

export default BookingActions

import { Link } from 'react-router-dom'
import { useTenant } from '@/shared/tenant/TenantContext'
import {
  buildProductWhatsAppMessage,
  openWhatsAppShare,
} from '@/shared/utils/whatsappShare'
import { cn } from '@/shared/utils/cn'

const iconBtnClass =
  'inline-flex shrink-0 items-center justify-center size-[26px] sm:size-7.5 rounded-md border border-transparent text-[0.7rem] sm:text-[0.8rem] cursor-pointer transition-[background-color,border-color,color,transform] duration-160 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'

function ProductActions({
  product,
  onDelete,
  deleting,
  companyName,
  onAddStock,
  onRestoreDamaged,
  onViewLogs,
}) {
  const { path, companyName: tenantCompanyName, branding } = useTenant()

  const handleShare = () => {
    openWhatsAppShare({
      message: buildProductWhatsAppMessage(product, companyName || tenantCompanyName, {
        contactNumber: branding?.phone_number || '',
      }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
      {onAddStock && (
        <button
          type="button"
          title="Add Stock"
          aria-label="Add Stock"
          className={cn(
            iconBtnClass,
            'border-emerald-700/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onAddStock(product)
          }}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" />
        </button>
      )}

      {onRestoreDamaged && (product.damaged_quantity > 0) && (
        <button
          type="button"
          title="Restore Damaged Units"
          aria-label="Restore Damaged Units"
          className={cn(
            iconBtnClass,
            'border-amber-700/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onRestoreDamaged(product)
          }}
        >
          <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />
        </button>
      )}

      {onViewLogs && (
        <button
          type="button"
          title="Stock Movement History"
          aria-label="Stock Movement History"
          className={cn(
            iconBtnClass,
            'border-indigo-700/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onViewLogs(product)
          }}
        >
          <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
        </button>
      )}

      <Link
        to={path(`/products/${product.id}/edit`)}
        state={{ product }}
        title="Edit Product"
        aria-label="Edit Product"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          iconBtnClass,
          'border-[#f0d19a] bg-accent-soft text-accent-text hover:bg-[#fbd9a5]',
        )}
      >
        <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
      </Link>

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
      >
        <i className="fa-brands fa-whatsapp" aria-hidden="true" />
      </button>

      {onDelete && product.status !== 'Discontinued' && (
        <button
          type="button"
          title="Discontinue Product"
          aria-label="Discontinue Product"
          disabled={deleting}
          className={cn(
            iconBtnClass,
            'border-rose-300/40 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(product)
          }}
        >
          <i className="fa-solid fa-ban" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default ProductActions

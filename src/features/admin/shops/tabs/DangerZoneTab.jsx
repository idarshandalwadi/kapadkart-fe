import { useState } from 'react'
import { toast } from 'sonner'
import { restoreShop, setShopStatus, softDeleteShop } from '@/features/admin/shops/api'
import ConfirmDialog from '@/shared/components/AdminConfirmDialog'

export default function DangerZoneTab({ shop, onShopUpdated }) {
  const [busy, setBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const isDeleted = shop.status === 'deleted'
  const isSuspended = shop.status === 'suspended'
  const isActive = shop.status === 'active'

  const handleConfirm = async () => {
    if (!pendingAction) return
    const { type } = pendingAction
    setBusy(true)

    try {
      if (type === 'suspend') {
        await setShopStatus(shop.slug, 'suspended')
        toast.success(`Suspended shop "${shop.slug}"`)
      } else if (type === 'activate') {
        await setShopStatus(shop.slug, 'active')
        toast.success(`Activated shop "${shop.slug}"`)
      } else if (type === 'delete') {
        await softDeleteShop(shop.slug)
        toast.success(`Soft-deleted shop "${shop.slug}"`)
      } else if (type === 'restore') {
        await restoreShop(shop.slug)
        toast.success(`Restored shop "${shop.slug}"`)
      }

      setPendingAction(null)
      if (onShopUpdated) {
        await onShopUpdated()
      }
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Danger Zone Container */}
      <div className="rounded-2xl border border-danger/30 bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/80 pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-bg text-danger">
            <i className="fa-solid fa-triangle-exclamation text-lg" />
          </div>
          <div>
            <h4 className="m-0 font-display text-lg font-semibold text-danger">
              Lifecycle & Destructive Controls
            </h4>
            <p className="m-0 text-xs text-muted">
              Actions here immediately modify the store availability, customer accessibility, and admin access.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {/* Action 1: Suspend / Activate */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="max-w-xl">
              <h5 className="m-0 font-semibold text-ink">
                {isSuspended ? 'Activate Shop' : 'Suspend Shop'}
              </h5>
              <p className="mt-1 mb-0 text-xs text-muted leading-relaxed">
                {isSuspended
                  ? 'Re-enables the store and allows the owner and staff members to sign in.'
                  : 'Temporarily disables login access for the shop owner and staff. Public storefront and data remain preserved.'}
              </p>
            </div>

            {isSuspended ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingAction({ type: 'activate' })}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-ok px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[40px]"
              >
                <i className="fa-solid fa-play" />
                <span>Activate Store</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || isDeleted}
                onClick={() => setPendingAction({ type: 'suspend' })}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-warn/40 bg-warn-bg px-4 py-2 text-xs font-semibold text-warn hover:bg-warn-bg/80 transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <i className="fa-solid fa-pause" />
                <span>Suspend Store</span>
              </button>
            )}
          </div>

          {/* Action 2: Soft Delete / Restore */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="max-w-xl">
              <h5 className="m-0 font-semibold text-ink">
                {isDeleted ? 'Restore Shop' : 'Soft Delete Shop'}
              </h5>
              <p className="mt-1 mb-0 text-xs text-muted leading-relaxed">
                {isDeleted
                  ? 'Restores the soft-deleted shop back into active platform status and regular listing.'
                  : 'Marks the shop as deleted. All products, bookings, and customer records are safely preserved and can be restored at any time.'}
              </p>
            </div>

            {isDeleted ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingAction({ type: 'restore' })}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 min-h-[40px] shadow-sm"
              >
                <i className="fa-solid fa-rotate-left" />
                <span>Restore Store</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingAction({ type: 'delete' })}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 min-h-[40px] shadow-sm"
              >
                <i className="fa-solid fa-trash" />
                <span>Delete Store</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.type === 'suspend'
            ? 'Suspend Shop'
            : pendingAction?.type === 'activate'
              ? 'Activate Shop'
              : pendingAction?.type === 'restore'
                ? 'Restore Shop'
                : 'Delete Shop'
        }
        message={
          pendingAction?.type === 'suspend'
            ? `Suspend "${shop.settings?.company_name || shop.name}" (${shop.slug})? The shop owner and staff will not be able to sign in until re-activated.`
            : pendingAction?.type === 'activate'
              ? `Re-activate "${shop.settings?.company_name || shop.name}" (${shop.slug})? Users will immediately regain access.`
              : pendingAction?.type === 'restore'
                ? `Restore soft-deleted "${shop.settings?.company_name || shop.name}" (${shop.slug}) back to active status?`
                : `Soft-delete "${shop.settings?.company_name || shop.name}" (${shop.slug})? It will be hidden from default lists but can be restored later.`
        }
        confirmLabel={
          pendingAction?.type === 'suspend'
            ? 'Suspend'
            : pendingAction?.type === 'activate'
              ? 'Activate'
              : pendingAction?.type === 'restore'
                ? 'Restore'
                : 'Delete'
        }
        variant={
          pendingAction?.type === 'suspend'
            ? 'warn'
            : pendingAction?.type === 'activate' || pendingAction?.type === 'restore'
              ? 'accent'
              : 'danger'
        }
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!busy) setPendingAction(null)
        }}
      />
    </div>
  )
}

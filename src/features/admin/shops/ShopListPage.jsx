import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  listShops,
  restoreShop,
  setShopStatus,
  softDeleteShop,
} from '@/features/admin/shops/api'
import ConfirmDialog from '@/shared/components/AdminConfirmDialog'
import SuspensionModal from './SuspensionModal'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    suspended: 'bg-amber-50 text-amber-700 border-amber-200',
    deleted: 'bg-red-50 text-red-700 border-red-200',
  }
  const icons = {
    active: 'fa-circle-check',
    suspended: 'fa-pause',
    deleted: 'fa-trash',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      <i className={`fa-solid ${icons[status] || 'fa-circle'} text-[0.65rem]`} aria-hidden="true" />
      {status}
    </span>
  )
}

const actionBtn =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 min-h-[44px] min-w-[44px] text-xs font-semibold disabled:opacity-50'

export default function ShopListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || 'all'
  const includeDeleted = searchParams.get('include_deleted') === 'true' || statusFilter === 'deleted'

  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [busySlug, setBusySlug] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [suspendingShop, setSuspendingShop] = useState(null)

  const load = async (showDeleted = includeDeleted) => {
    setLoading(true)
    try {
      const data = await listShops({ includeDeleted: showDeleted })
      setShops(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to load shops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(includeDeleted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted])

  const runAction = async (slug, action, successMessage) => {
    setBusySlug(slug)
    try {
      await action()
      toast.success(successMessage)
      setPendingAction(null)
      setSuspendingShop(null)
      await load(includeDeleted)
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Action failed')
    } finally {
      setBusySlug(null)
    }
  }

  const handleToggleStatus = (shop) => {
    if (shop.status === 'active') {
      setSuspendingShop(shop)
    } else if (shop.status === 'suspended') {
      runAction(
        shop.slug,
        () => setShopStatus(shop.slug, 'active'),
        `Activated shop "${shop.company_name || shop.name}"`,
      )
    }
  }

  const handleConfirmSuspension = async ({ reason, customReason }) => {
    if (!suspendingShop) return
    await runAction(
      suspendingShop.slug,
      () => setShopStatus(suspendingShop.slug, 'suspended', { reason, customReason }),
      `Suspended shop "${suspendingShop.company_name || suspendingShop.name}"`,
    )
  }

  const handleConfirm = async () => {
    if (!pendingAction) return
    const { type, shop } = pendingAction

    if (type === 'delete') {
      await runAction(shop.slug, () => softDeleteShop(shop.slug), `Deleted shop "${shop.slug}"`)
    }
  }

  const handleStatusChange = (tab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (tab === 'all') {
      nextParams.delete('status')
    } else {
      nextParams.set('status', tab)
    }
    if (tab === 'deleted') {
      nextParams.set('include_deleted', 'true')
    }
    setSearchParams(nextParams)
  }

  const handleToggleIncludeDeleted = (checked) => {
    const nextParams = new URLSearchParams(searchParams)
    if (checked) {
      nextParams.set('include_deleted', 'true')
    } else {
      nextParams.delete('include_deleted')
      if (statusFilter === 'deleted') {
        nextParams.delete('status')
      }
    }
    setSearchParams(nextParams)
  }

  const confirming = Boolean(pendingAction && busySlug === pendingAction.shop.slug)

  const filteredShops = (shops || []).filter((shop) => {
    if (statusFilter === 'all') return true
    return shop.status === statusFilter
  })

  return (
    <div className="flex flex-col gap-3.5 sm:gap-6">
      <div className="flex flex-wrap items-center sm:items-end justify-between gap-2.5 sm:gap-4">
        <div>
          <h2 className="m-0 inline-flex items-center gap-2 sm:gap-3 font-display text-lg sm:text-[2.15rem] font-semibold tracking-[-0.03em] text-ink">
            <i className="fa-solid fa-store text-accent text-base sm:text-2xl" aria-hidden="true" />
            <span>Registered Shops</span>
          </h2>
          <p className="mt-0.5 sm:mt-1 mb-0 text-xs sm:text-sm text-muted hidden sm:block">
            Add, update, suspend, or soft-delete client shops.
          </p>
        </div>

        <Link
          to="/admin/shops/new"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg sm:rounded-xl bg-accent px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-accent-hover transition-colors no-underline shadow-2xs"
        >
          <i className="fa-solid fa-circle-plus text-xs" />
          <span>Add New Shop</span>
        </Link>
      </div>

      {/* Filter Tabs & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {['all', 'active', 'suspended', 'deleted'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleStatusChange(tab)}
              className={`cursor-pointer rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold capitalize transition-colors min-h-[30px] sm:min-h-[36px] shrink-0 ${
                statusFilter === tab
                  ? 'bg-accent text-white shadow-2xs'
                  : 'bg-surface text-ink-soft border border-border/80 hover:bg-canvas'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => handleToggleIncludeDeleted(e.target.checked)}
          />
          <i className="fa-solid fa-eye-slash text-muted" aria-hidden="true" />
          <span>Include deleted</span>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="m-0 inline-flex items-center gap-2 p-6 text-muted">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            Loading shops…
          </p>
        ) : filteredShops.length === 0 ? (
          <div className="p-8 text-center">
            <i className="fa-solid fa-store text-3xl text-muted/50" aria-hidden="true" />
            <p className="mt-3 mb-0 text-muted">
              {statusFilter !== 'all' ? `No ${statusFilter} shops found.` : 'No shops yet.'}
            </p>
            {statusFilter === 'all' && (
              <Link
                to="/admin/shops/new"
                className="mt-3 inline-flex items-center gap-2 font-semibold text-accent no-underline"
              >
                <i className="fa-solid fa-circle-plus" aria-hidden="true" />
                Create your first shop
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Shop</th>
                  <th className="px-4 py-3 font-semibold">Model & Quota</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.map((shop) => {
                  const busy = busySlug === shop.slug
                  const bType = shop.business_type || shop.businessType || 'SALES_AND_RENTAL'
                  return (
                    <tr key={shop.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/shops/${shop.slug}`}
                          className="group block no-underline"
                        >
                          <div className="font-semibold text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
                            <span>{shop.company_name || shop.name}</span>
                            <i className="fa-solid fa-arrow-up-right-from-square text-[0.65rem] opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                          </div>
                          <div className="text-xs text-muted group-hover:text-accent/80 transition-colors font-mono">{shop.slug}</div>
                          {shop.created_by && (
                            <div className="mt-1 flex items-center gap-1 text-[0.7rem] text-muted font-normal" title={`Created by Admin: ${shop.created_by}`}>
                              <i className="fa-solid fa-user-plus text-[0.6rem] text-accent/80" />
                              <span>By <strong className="font-medium text-ink-soft">{shop.created_by}</strong></span>
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                            bType === 'RENTAL' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                            bType === 'SALES' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                            'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                          }`}>
                            <i className={`fa-solid text-[0.6rem] ${
                              bType === 'RENTAL' ? 'fa-key' :
                              bType === 'SALES' ? 'fa-cash-register' :
                              'fa-boxes-stacked'
                            }`} />
                            {bType === 'RENTAL' ? 'Rental Only' : bType === 'SALES' ? 'Sales Only' : 'Both'}
                          </span>
                          <span className="text-[0.72rem] text-muted">
                            P: {shop.max_products != null ? shop.max_products : '∞'} | B: {shop.max_bookings != null ? shop.max_bookings : '∞'} | S: {shop.max_sales != null ? shop.max_sales : '∞'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{shop.owner?.full_name || '—'}</div>
                        <div className="text-xs text-muted">{shop.owner?.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3">{shop.phone_number || '—'}</td>
                      <td className="px-4 py-3">
                        {shop.status === 'deleted' ? (
                          <StatusBadge status={shop.status} />
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={shop.status === 'active'}
                              aria-label={`Toggle status for ${shop.company_name || shop.name}`}
                              disabled={busy}
                              onClick={() => handleToggleStatus(shop)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 ${
                                shop.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600'
                              }`}
                              title={shop.status === 'active' ? 'Click to suspend shop' : 'Click to activate shop'}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  shop.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-xs font-semibold capitalize ${
                                shop.status === 'active' ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {shop.status}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {shop.status !== 'deleted' && (
                            <Link
                              to={`/admin/shops/${shop.slug}/edit`}
                              className={`${actionBtn} text-slate-700 no-underline hover:bg-slate-50 hover:text-slate-900 border-slate-200`}
                            >
                              <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                              Edit
                            </Link>
                          )}
                          {shop.status !== 'deleted' ? (
                            <button
                              type="button"
                              disabled={busy}
                              className={`${actionBtn} text-red-600 hover:bg-red-50 hover:border-red-300 border-slate-200`}
                              onClick={() => setPendingAction({ type: 'delete', shop })}
                            >
                              <i className="fa-solid fa-trash" aria-hidden="true" />
                              Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              className={`${actionBtn} text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 border-slate-200`}
                              onClick={() =>
                                runAction(
                                  shop.slug,
                                  () => restoreShop(shop.slug),
                                  `Restored shop "${shop.slug}"`,
                                )
                              }
                            >
                              {busy ? (
                                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                              ) : (
                                <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                              )}
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction && pendingAction.type === 'delete')}
        title="Delete shop"
        message={
          pendingAction
            ? `Soft-delete "${pendingAction.shop.company_name || pendingAction.shop.name}" (${pendingAction.shop.slug})? You can restore it later from the deleted list.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={confirming}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!confirming) setPendingAction(null)
        }}
      />

      <SuspensionModal
        open={Boolean(suspendingShop)}
        shop={suspendingShop}
        loading={busySlug === suspendingShop?.slug}
        onConfirm={handleConfirmSuspension}
        onClose={() => {
          if (busySlug !== suspendingShop?.slug) setSuspendingShop(null)
        }}
      />
    </div>
  )
}

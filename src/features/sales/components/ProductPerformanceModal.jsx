import React from 'react'
import { Dialog } from '@/shared/components/Dialog'
import { cn } from '@/shared/utils/cn'
import CopyButton from '@/shared/components/CopyButton'

function formatCurrency(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '₹0'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0%'
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`
}

/**
 * ProductPerformanceModal displays an item-level breakdown of:
 * - Capital Invested (Acquisition cost, Current stock value, Cost of sold units)
 * - Revenue Breakdown (Rental earnings, Direct sales earnings)
 * - Net Profit & Return on Investment (ROI %, Break-even recovery status)
 * - Adaptable to tenant businessType (SALES, RENTAL, or HYBRID)
 */
export default function ProductPerformanceModal({
  product,
  open,
  onClose,
  onViewProductDetails,
  businessType = 'SALES_AND_RENTAL',
}) {
  if (!open || !product) return null

  const isRentalAllowed = businessType !== 'SALES'
  const isSalesAllowed = businessType !== 'RENTAL'

  // Metric derivations
  const purchasePrice = Number(product.purchase_price || 0)
  const currentStock = Number(product.total_quantity || 0)
  const unitsSold = Number(product.units_sold || 0)
  const damagedUnits = Number(product.damaged_quantity || 0)
  const totalPurchased = product.total_purchased_quantity ?? (currentStock + unitsSold)

  const investedAmount = product.invested_amount ?? (purchasePrice * totalPurchased)
  const currentStockValuation = purchasePrice * currentStock
  const costOfSoldGoods = purchasePrice * unitsSold

  const timesRented = Number(product.times_rented || 0)
  const rentalRevenue = Number(product.rental_revenue || 0)
  const salesRevenue = Number(product.sales_revenue || 0)
  const totalRevenue = Number(product.total_revenue || (rentalRevenue + salesRevenue))

  const netProfit = Number(product.net_profit ?? (totalRevenue - costOfSoldGoods))
  const isProfitable = netProfit >= 0

  // Break-even and Capital Recovery calculation
  // How much total revenue vs total initial investment
  const recoveryRate = investedAmount > 0 ? Math.min(100, Math.max(0, (totalRevenue / investedAmount) * 100)) : 100
  const isFullyRecovered = totalRevenue >= investedAmount
  const remainingToBreakEven = Math.max(0, investedAmount - totalRevenue)

  // ROI on capital deployed
  const roiPercent = investedAmount > 0 ? (netProfit / investedAmount) * 100 : 0

  // Rental Turnover Ratio: how many times the initial purchase price was returned via rentals
  const rentalTurnoverRatio = purchasePrice > 0 ? (rentalRevenue / (purchasePrice * totalPurchased)).toFixed(2) : 0

  // Average Sale Price per sold unit
  const avgSalePrice = unitsSold > 0 ? (salesRevenue / unitsSold) : 0
  const grossSalesMargin = salesRevenue - costOfSoldGoods

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="performance-modal-title"
      maxWidthClass="max-w-[46rem]"
      className="max-h-[90vh] overflow-y-auto"
    >
      {/* Modal Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 sm:px-6 py-4 bg-surface">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.68rem] sm:text-[0.72rem] font-bold text-accent-text border border-[#f0d19a]">
              Financial Performance Breakdown
            </span>
            {product.product_code && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-text-muted">
                <span>{product.product_code}</span>
                <CopyButton text={product.product_code} />
              </span>
            )}
          </div>
          <h2
            id="performance-modal-title"
            className="mt-1 truncate font-display text-lg sm:text-xl font-bold text-text"
          >
            {product.product_name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
          aria-label="Close dialog"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-6 text-text">
        {/* Top Verdict KPI Banner */}
        <div
          className={cn(
            'rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-2xs',
            isProfitable
              ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20'
              : 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/20',
          )}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
                  isProfitable
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white',
                )}
              >
                <i className={cn('fa-solid', isProfitable ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down')} aria-hidden="true" />
                {isProfitable ? 'Profitable Asset' : 'Investment in Recovery'}
              </span>
              <span className="text-xs font-semibold text-text-muted">
                {isRentalAllowed && isSalesAllowed
                  ? 'Combined Streams'
                  : isRentalAllowed
                    ? 'Rental Stream'
                    : 'Sales Stream'}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-text">
                {formatCurrency(netProfit)}
              </span>
              <span
                className={cn(
                  'text-xs sm:text-sm font-bold font-mono',
                  roiPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                )}
              >
                ({formatPercent(roiPercent)} ROI)
              </span>
            </div>

            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              {isFullyRecovered
                ? `Total generated revenue has recovered all acquisition expenses with ${formatCurrency(netProfit)} in net profits.`
                : `Generated ${formatCurrency(totalRevenue)} of ${formatCurrency(investedAmount)} capital. Needs ${formatCurrency(remainingToBreakEven)} more to reach 100% break-even.`}
            </p>
          </div>

          {/* Break-even progress meter */}
          <div className="sm:w-48 shrink-0 bg-white dark:bg-surface rounded-xl border border-border p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted mb-1.5">
              <span>Capital Recovery</span>
              <span className="font-bold font-mono text-text">{recoveryRate.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  recoveryRate >= 100 ? 'bg-emerald-500' : 'bg-accent',
                )}
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
            <p className="mt-1 text-[0.68rem] text-text-secondary text-right">
              {recoveryRate >= 100 ? 'Fully recovered' : `${formatCurrency(remainingToBreakEven)} remaining`}
            </p>
          </div>
        </div>

        {/* 1. Capital Invested & Valuation Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-vault text-primary text-xs" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Capital Invested & Inventory Valuation
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-text-muted">
              Unit Cost: {formatCurrency(purchasePrice)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-surface-muted/60 border border-border/60 p-3 flex flex-col justify-between">
              <span className="text-[0.68rem] font-bold uppercase text-text-muted">Total Capital Invested</span>
              <span className="text-lg font-bold font-display text-primary mt-1">
                {formatCurrency(investedAmount)}
              </span>
              <span className="text-[0.68rem] text-text-muted mt-0.5">
                {totalPurchased} total units acquired
              </span>
            </div>

            <div className="rounded-lg bg-surface-muted/60 border border-border/60 p-3 flex flex-col justify-between">
              <span className="text-[0.68rem] font-bold uppercase text-text-muted">Current Stock Valuation</span>
              <span className="text-lg font-bold font-display text-text mt-1">
                {formatCurrency(currentStockValuation)}
              </span>
              <span className="text-[0.68rem] text-text-muted mt-0.5">
                {currentStock} units in shop / warehouse
              </span>
            </div>

            <div className="rounded-lg bg-surface-muted/60 border border-border/60 p-3 flex flex-col justify-between">
              <span className="text-[0.68rem] font-bold uppercase text-text-muted">Cost of Units Sold</span>
              <span className="text-lg font-bold font-display text-text-secondary mt-1">
                {formatCurrency(costOfSoldGoods)}
              </span>
              <span className="text-[0.68rem] text-text-muted mt-0.5">
                {unitsSold > 0 ? `${unitsSold} units @ ${formatCurrency(purchasePrice)}` : '0 direct sales'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Revenue Streams Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-coins text-accent text-xs" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Revenue Streams Breakdown
              </h3>
            </div>
            <span className="text-xs font-bold text-text">
              Total Revenue: {formatCurrency(totalRevenue)}
            </span>
          </div>

          <div
            className={cn(
              'grid gap-3',
              isRentalAllowed && isSalesAllowed
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1',
            )}
          >
            {/* Rental Revenue Stream */}
            {isRentalAllowed && (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/10 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    <i className="fa-solid fa-calendar-check text-[0.7rem]" aria-hidden="true" />
                    Rental Performance
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400">
                    {timesRented} Bookings
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-display text-text">
                    {formatCurrency(rentalRevenue)}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {timesRented > 0 ? `Avg ${formatCurrency(rentalRevenue / timesRented)} / rental` : 'No rentals yet'}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-200/50 text-[0.72rem] text-text-secondary flex items-center justify-between">
                  <span>Turnover Return:</span>
                  <span className="font-semibold text-text">{rentalTurnoverRatio}x initial cost</span>
                </div>
              </div>
            )}

            {/* Sales Revenue Stream */}
            {isSalesAllowed && (
              <div className="rounded-lg border border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/10 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    <i className="fa-solid fa-receipt text-[0.7rem]" aria-hidden="true" />
                    Direct Sales Performance
                  </span>
                  <span className="text-xs font-bold font-mono text-blue-700 dark:text-blue-400">
                    {unitsSold} Units Sold
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-display text-text">
                    {formatCurrency(salesRevenue)}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {unitsSold > 0 ? `Avg ${formatCurrency(avgSalePrice)} / unit` : 'No units sold'}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200/50 text-[0.72rem] text-text-secondary flex items-center justify-between">
                  <span>Gross Sales Margin:</span>
                  <span className={cn('font-semibold', grossSalesMargin >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {grossSalesMargin >= 0 ? `+${formatCurrency(grossSalesMargin)}` : `-${formatCurrency(Math.abs(grossSalesMargin))}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Mathematical Formula Card */}
        <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3 text-xs text-text-secondary">
          <p className="font-bold text-text mb-1">How Net Profit is calculated:</p>
          <div className="font-mono bg-white dark:bg-surface border border-border p-2 rounded-lg text-[0.75rem] text-text">
            <span>Net Profit = </span>
            <span className="text-accent font-semibold">{formatCurrency(totalRevenue)} (Total Rev)</span>
            <span> − </span>
            <span className="text-text-muted font-semibold">{formatCurrency(costOfSoldGoods)} (Cost of Sold Units)</span>
            <span> = </span>
            <span className={cn('font-bold', netProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold')}>
              {formatCurrency(netProfit)}
            </span>
          </div>
          {currentStock > 0 && (
            <p className="mt-1.5 text-[0.7rem] text-text-muted leading-tight">
              * Note: {currentStock} in-stock units remain as active business assets valued at {formatCurrency(currentStockValuation)} and are not subtracted as realized losses until sold or marked damaged.
            </p>
          )}
          {damagedUnits > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-danger-bg px-2 py-0.5 text-[0.72rem] font-bold text-danger-text">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <span>{damagedUnits} units damaged (Loss potential: {formatCurrency(purchasePrice * damagedUnits)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-border px-4 sm:px-6 py-3 bg-surface">
        {onViewProductDetails ? (
          <button
            type="button"
            onClick={onViewProductDetails}
            className="cursor-pointer text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <i className="fa-solid fa-circle-info text-[0.75rem]" aria-hidden="true" />
            <span>View Full Product Details & Gallery</span>
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-border bg-white px-4 py-1.5 text-xs font-semibold text-text hover:bg-surface-muted transition-colors"
        >
          Close
        </button>
      </div>
    </Dialog>
  )
}

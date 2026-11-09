import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { createProduct, deleteProduct, fetchProducts } from '@/features/products/api/products'
import { resolveBrand, resolveCategory } from '@/features/settings/api/catalog'
import ProductCard from '@/features/products/components/ProductCard'
import ProductImportDialog from '@/features/products/components/ProductImportDialog'
import ProductInfoDialog from '@/features/products/components/ProductInfoDialog'
import ProductTable from '@/features/products/components/ProductTable'
import AddStockDialog from '@/features/products/components/AddStockDialog'
import RestoreDamagedDialog from '@/features/products/components/RestoreDamagedDialog'
import ProductInventoryLogDialog from '@/features/products/components/ProductInventoryLogDialog'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import FormSelect from '@/shared/components/FormSelect'
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_PRODUCT_VISIBLE_COLUMNS,
  LIMIT_OPTIONS,
  LOW_STOCK_THRESHOLD_OPTIONS,
  PRODUCT_TABLE_COLUMNS,
} from '@/features/products/constants/products'
import {
  PRODUCT_SORT_CYCLE,
  containsOnlySampleData,
  downloadProductsCsv,
  downloadProductsSampleCsv,
  filterOutSampleRows,
  parseProductsCsv,
} from '@/features/products/utils/productCsv'
import ColumnPicker from '@/shared/components/ColumnPicker'
import ListingFilterBar from '@/shared/components/ListingFilterBar'
import Pagination from '@/shared/components/Pagination'
import { ClothingCardSkeleton, TableCardSkeleton } from '@/shared/components/skeletons'
import { useColumnVisibility } from '@/shared/hooks/useColumnVisibility'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/utils/cn'
import { useTenant } from '@/shared/tenant/TenantContext'

async function fetchAllMatchingProducts(filters) {
  const all = []
  let page = 1

  while (true) {
    const json = await fetchProducts({
      ...filters,
      page,
      limit: 100,
    })
    all.push(...(json.data ?? []))
    if (page >= (json.pagination?.totalPages || 1)) break
    page += 1
  }

  return all
}

function ProductsPage() {
  const { path, slug, businessType } = useTenant()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    visibleKeys,
    toggle: toggleColumn,
    showAll: showAllColumns,
    resetDefault: resetDefaultColumns,
    isDefault: isDefaultColumns,
  } = useColumnVisibility(
    `kapadkart:table-columns:${slug}:products:v1`,
    PRODUCT_TABLE_COLUMNS,
    DEFAULT_PRODUCT_VISIBLE_COLUMNS,
  )
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const stock = searchParams.get('stock') || ''
  const [lowStockThreshold, setLowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD)
  const [search, setSearch] = useState('')
  const [sortIndex, setSortIndex] = useState(0)

  const debouncedSearch = useDebouncedValue(search)
  const currentSort = PRODUCT_SORT_CYCLE[sortIndex]

  const [viewMode, setViewMode] = useState('table')
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024
    }
    return false
  })

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const effectiveViewMode = isMobileOrTablet ? 'card' : viewMode
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [stockSummary, setStockSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [stockProduct, setStockProduct] = useState(null)
  const [restoreProduct, setRestoreProduct] = useState(null)
  const [logsProduct, setLogsProduct] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importError, setImportError] = useState(null)

  const filterParams = {
    stock,
    low_stock_threshold: lowStockThreshold,
    search: debouncedSearch.trim(),
    sort_by: currentSort.sort_by,
    sort_order: currentSort.sort_order,
  }

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const json = await fetchProducts({
        page,
        limit,
        ...filterParams,
      })

      setProducts(json.data ?? [])
      setPagination(json.pagination ?? null)
      setStockSummary(json.stock_summary ?? null)
    } catch (err) {
      setProducts([])
      setPagination(null)
      setStockSummary(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, limit, stock, lowStockThreshold, debouncedSearch, sortIndex])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sortIndex, stock, lowStockThreshold])

  const handleStockChipClick = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const nextStock = stock === value && value !== '' ? '' : value
      if (nextStock) next.set('stock', nextStock)
      else next.delete('stock')
      return next
    }, { replace: true })
    setPage(1)
  }

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value))
    setPage(1)
  }

  const handleSortCycle = () => {
    setSortIndex((index) => (index + 1) % PRODUCT_SORT_CYCLE.length)
  }

  const handleDeleteRequest = (product) => {
    setPendingDelete(product)
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return

    setDeletingId(pendingDelete.id)
    setError(null)

    try {
      await deleteProduct(pendingDelete.id)
      toast.success(`Discontinued "${pendingDelete.product_name}"`)
      setPendingDelete(null)
      await loadProducts()
    } catch (err) {
      toast.error(err.message)
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)

    try {
      const rows = await fetchAllMatchingProducts(filterParams)
      if (!rows.length) {
        throw new Error('No products to export for the current filters')
      }
      downloadProductsCsv(rows, undefined, businessType)
      toast.success(`Exported ${rows.length} product${rows.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error(err.message)
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    setImportError(null)
    setImportDialogOpen(true)
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError(null)

    try {
      const text = await file.text()
      const allParsedRows = parseProductsCsv(text, businessType)

      if (containsOnlySampleData(allParsedRows)) {
        throw new Error(
          'The uploaded file contains unmodified sample template data. Please replace the sample rows with your real products before importing.',
        )
      }

      // Automatically filter out any untouched sample rows if mixed with real products
      const rows = filterOutSampleRows(allParsedRows)
      if (rows.length === 0) {
        throw new Error(
          'No valid custom products found to import. Please add your real products to the CSV.',
        )
      }

      let successCount = 0
      const failures = []

      const brandCache = new Map()
      const categoryCache = new Map()

      async function resolveRowBrand(rawName) {
        const trimmed = String(rawName ?? '').trim()
        if (!trimmed) return null
        const key = trimmed.toLowerCase()
        if (brandCache.has(key)) return brandCache.get(key)
        const json = await resolveBrand(trimmed)
        const canonical = json.data?.name ?? trimmed
        brandCache.set(key, canonical)
        return canonical
      }

      async function resolveRowCategory(rawName) {
        const trimmed = String(rawName ?? '').trim()
        if (!trimmed) return null
        const key = trimmed.toLowerCase()
        if (categoryCache.has(key)) return categoryCache.get(key)
        const json = await resolveCategory(trimmed)
        const canonical = json.data?.name ?? trimmed
        categoryCache.set(key, canonical)
        return canonical
      }

      for (let i = 0; i < rows.length; i += 1) {
        const csvRow = i + 2
        const row = rows[i]

        try {
          let resolvedBrand = row.brand || null
          if (row.brand) {
            try {
              resolvedBrand = await resolveRowBrand(row.brand)
            } catch (err) {
              throw new Error(`Brand "${row.brand}" could not be processed: ${err.message}`)
            }
          }

          let resolvedCategory = row.category || null
          if (row.category) {
            try {
              resolvedCategory = await resolveRowCategory(row.category)
            } catch (err) {
              throw new Error(`Category "${row.category}" could not be processed: ${err.message}`)
            }
          }

          await createProduct({
            ...row,
            total_quantity: Number(row.total_quantity ?? row.quantity ?? 1),
            purchase_price: Number(row.purchase_price ?? 0),
            brand: resolvedBrand,
            category: resolvedCategory,
          })
          successCount += 1
        } catch (err) {
          failures.push(`Row ${csvRow} (${row.product_code || row.product_name}): ${err.message}`)
        }
      }

      await loadProducts()

      if (failures.length) {
        const message = `Imported ${successCount} of ${rows.length}. Failed: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '…' : ''}`
        setImportError(message)
        toast.warning(message)
      } else {
        toast.success(
          `Successfully imported ${successCount} product${successCount !== 1 ? 's' : ''}.`,
        )
        setImportDialogOpen(false)
      }
    } catch (err) {
      toast.error(err.message)
      setImportError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex animate-fade-up flex-col gap-3 sm:gap-[1.35rem] pb-12">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="page-kicker">Inventory</p>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Products</h1>
            {pagination && (
              <span className="page-count">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="page-lead">Browse, track stock movements, and manage your collection.</p>
        </div>
        <div className="page-header-actions">
          {/* View toggle visible on desktop / laptop (>= 1024px); on phone & tablet, card view is shown directly */}
          <div className="hidden lg:flex view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={cn('inline-flex items-center gap-[0.4rem]', viewMode === 'table' && 'active')}
              onClick={() => setViewMode('table')}
            >
              <i className="fa-solid fa-table" aria-hidden="true" /> Table
            </button>
            <button
              type="button"
              className={cn('inline-flex items-center gap-[0.4rem]', viewMode === 'card' && 'active')}
              onClick={() => setViewMode('card')}
            >
              <i className="fa-solid fa-grip" aria-hidden="true" /> Card
            </button>
          </div>
          <Link to={path('/products/add')} className="btn-primary !px-3 !py-1.5 !text-xs sm:!px-[1.1rem] sm:!py-[0.6rem] sm:!text-[0.88rem]">
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* QUICK STATUS CHIPS */}
      {stockSummary && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            {
              key: '',
              label: 'All',
              count:
                stockSummary.total ??
                pagination?.total ??
                (stockSummary.out_of_stock + stockSummary.low_stock + stockSummary.in_stock),
              activeClass: 'border-accent bg-accent-soft text-accent-text font-bold shadow-2xs',
              dotClass: 'bg-accent',
            },
            {
              key: 'alerts',
              label: 'Alerts',
              count: (stockSummary.out_of_stock || 0) + (stockSummary.low_stock || 0),
              activeClass: 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold shadow-2xs',
              dotClass: 'bg-orange-500',
            },
            {
              key: 'out_of_stock',
              label: 'Out of stock',
              count: stockSummary.out_of_stock,
              activeClass: 'border-[#94a3b8] bg-info-bg text-info-text font-bold shadow-2xs',
              dotClass: 'bg-[#64748b]',
            },
            {
              key: 'low_stock',
              label: `Low stock (≤${stockSummary.threshold ?? lowStockThreshold})`,
              count: stockSummary.low_stock,
              activeClass: 'border-[#e8b86a] bg-warning-bg text-warning-text font-bold shadow-2xs',
              dotClass: 'bg-[#d97706]',
            },
            {
              key: 'in_stock',
              label: 'In stock',
              count: stockSummary.in_stock,
              activeClass: 'border-[#86b89a] bg-success-bg text-success-text font-bold shadow-2xs',
              dotClass: 'bg-[#16a34a]',
            },
            {
              key: 'damaged',
              label: 'Damaged',
              count: stockSummary.damaged || 0,
              activeClass: 'border-rose-500 bg-rose-500/10 text-rose-400 font-bold shadow-2xs',
              dotClass: 'bg-rose-500',
            },
          ].map((chip) => {
            const active = chip.key === '' ? !stock : stock === chip.key
            return (
              <button
                key={chip.key || 'all'}
                type="button"
                onClick={() => handleStockChipClick(chip.key)}
                className={cn(
                  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg sm:rounded-full border px-2.5 sm:px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap',
                  active
                    ? chip.activeClass
                    : 'border-border bg-white text-text-secondary hover:border-[#f0d19a] hover:bg-accent-soft hover:text-accent-text',
                )}
                aria-pressed={active}
              >
                <span className={cn('size-1.5 rounded-full', chip.dotClass)} aria-hidden="true" />
                <span>{chip.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[0.68rem] tabular-nums',
                    active ? 'bg-white/60 dark:bg-black/20' : 'bg-surface-muted text-text',
                  )}
                >
                  {chip.count ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* COMPACT SEARCH & FILTER BAR */}
      <ListingFilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search name, code, status, category, brand..."
        activeFilterCount={(stock ? 1 : 0) + (lowStockThreshold !== DEFAULT_LOW_STOCK_THRESHOLD ? 1 : 0)}
        activeChips={[
          ...(stock
            ? [
                {
                  key: 'stock',
                  label: `Stock: ${
                    {
                      in_stock: 'In stock',
                      low_stock: 'Low stock',
                      out_of_stock: 'Out of stock',
                      alerts: 'Stock alerts',
                      available: 'In hand',
                    }[stock] || stock
                  }`,
                  onRemove: () => handleStockChipClick(''),
                },
              ]
            : []),
          ...(lowStockThreshold !== DEFAULT_LOW_STOCK_THRESHOLD
            ? [
                {
                  key: 'threshold',
                  label: `Low stock ≤ ${lowStockThreshold}`,
                  onRemove: () => {
                    setLowStockThreshold(DEFAULT_LOW_STOCK_THRESHOLD)
                    setPage(1)
                  },
                },
              ]
            : []),
        ]}
        onClearAll={
          stock || lowStockThreshold !== DEFAULT_LOW_STOCK_THRESHOLD
            ? () => {
                handleStockChipClick('')
                setLowStockThreshold(DEFAULT_LOW_STOCK_THRESHOLD)
                setPage(1)
              }
            : null
        }
        extraActions={
          <button
            type="button"
            className="inline-flex h-9 sm:h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent-text transition-colors"
            onClick={handleSortCycle}
            title={`Sort: ${currentSort.label}. Tap to change.`}
            aria-label={`Sort: ${currentSort.label}`}
          >
            <i className="fa-solid fa-arrow-down-short-wide text-xs" aria-hidden="true" />
            <span className="hidden sm:inline max-w-[6.5rem] truncate">{currentSort.label}</span>
          </button>
        }
      >
        <div className="filter-field">
          <label htmlFor="filter-low-stock-threshold">Low stock ≤</label>
          <FormSelect
            id="filter-low-stock-threshold"
            value={lowStockThreshold}
            clearable={false}
            onChange={(e) => {
              setLowStockThreshold(Number(e.target.value))
              setPage(1)
            }}
            options={LOW_STOCK_THRESHOLD_OPTIONS.map((opt) => ({
              value: opt,
              label: String(opt),
            }))}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-limit">Per page</label>
          <FormSelect
            id="filter-limit"
            value={limit}
            clearable={false}
            onChange={handleLimitChange}
            options={LIMIT_OPTIONS.map((opt) => ({
              value: opt,
              label: String(opt),
            }))}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-product-columns">Columns</label>
          <ColumnPicker
            id="filter-product-columns"
            columns={PRODUCT_TABLE_COLUMNS}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onShowAll={showAllColumns}
            onResetDefault={resetDefaultColumns}
            isDefault={isDefaultColumns}
            disabled={viewMode !== 'table'}
          />
        </div>

        <div className="filter-field self-end sm:col-span-2 md:col-span-1 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 sm:h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm font-semibold text-text-secondary transition-colors hover:border-[#86b89a] hover:bg-success-bg hover:text-success-text disabled:cursor-not-allowed disabled:opacity-55"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            <i className="fa-solid fa-file-export text-xs" aria-hidden="true" />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
          <button
            type="button"
            className="inline-flex h-9 sm:h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm font-semibold text-text-secondary transition-colors hover:border-[#93c5fd] hover:bg-info-bg hover:text-info-text disabled:cursor-not-allowed disabled:opacity-55"
            onClick={handleImportClick}
            disabled={importing}
          >
            <i className="fa-solid fa-file-import text-xs" aria-hidden="true" />
            <span>{importing ? 'Importing...' : 'Import'}</span>
          </button>
        </div>
      </ListingFilterBar>

      {loading && (
        effectiveViewMode === 'card'
          ? <ClothingCardSkeleton count={limit > 12 ? 12 : limit} />
          : <TableCardSkeleton rows={6} cols={visibleKeys.length || 7} />
      )}

      {error && !loading && <p className="error-text">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">No products found.</div>
      )}

      {!loading && !error && products.length > 0 && effectiveViewMode === 'table' && (
        <ProductTable
          products={products}
          onDelete={handleDeleteRequest}
          onView={setViewingProduct}
          onAddStock={(p) => setStockProduct(p)}
          onRestoreDamaged={(p) => setRestoreProduct(p)}
          onViewLogs={(p) => setLogsProduct(p)}
          deletingId={deletingId}
          lowStockThreshold={lowStockThreshold}
          visibleColumns={visibleKeys}
        />
      )}

      {!loading && !error && products.length > 0 && effectiveViewMode === 'card' && (
        <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 min-[1900px]:grid-cols-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={handleDeleteRequest}
              onView={setViewingProduct}
              onAddStock={(p) => setStockProduct(p)}
              onRestoreDamaged={(p) => setRestoreProduct(p)}
              onViewLogs={(p) => setLogsProduct(p)}
              deleting={deletingId === product.id}
              lowStockThreshold={lowStockThreshold}
            />
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <ProductInfoDialog
        product={viewingProduct}
        open={Boolean(viewingProduct)}
        onClose={() => setViewingProduct(null)}
        onAddStock={(p) => {
          setViewingProduct(null)
          setStockProduct(p)
        }}
        onViewLogs={(p) => {
          setViewingProduct(null)
          setLogsProduct(p)
        }}
      />

      {stockProduct && (
        <AddStockDialog
          product={stockProduct}
          onClose={() => setStockProduct(null)}
          onSuccess={loadProducts}
        />
      )}

      {restoreProduct && (
        <RestoreDamagedDialog
          product={restoreProduct}
          onClose={() => setRestoreProduct(null)}
          onSuccess={loadProducts}
        />
      )}

      {logsProduct && (
        <ProductInventoryLogDialog
          product={logsProduct}
          onClose={() => setLogsProduct(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Discontinue product"
        message={
          pendingDelete
            ? `Discontinue "${pendingDelete.product_name}" (${pendingDelete.product_code})? It will no longer be available for new rentals or sales, but past invoices and history will be preserved.`
            : ''
        }
        confirmLabel="Discontinue"
        loading={Boolean(deletingId)}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deletingId) setPendingDelete(null)
        }}
      />

      <ProductImportDialog
        open={importDialogOpen}
        businessType={businessType}
        importing={importing}
        error={importError}
        onDownloadSample={() => downloadProductsSampleCsv(businessType)}
        onSelectFile={handleImportFile}
        onClose={() => {
          if (!importing) {
            setImportDialogOpen(false)
            setImportError(null)
          }
        }}
      />
    </div>
  )
}

export default ProductsPage

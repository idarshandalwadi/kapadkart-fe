import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import Pagination from '@/shared/components/Pagination'
import CatalogImportDialog from '@/features/settings/components/CatalogImportDialog'
import CatalogSheetAddDialog from '@/features/settings/components/CatalogSheetAddDialog'
import { cn } from '@/shared/utils/cn'
import { FIELD_LIMITS } from '@/shared/constants/fieldLimits'
import {
  downloadCatalogCsv,
  downloadCatalogTemplateCsv,
  parseCatalogCsv,
  toTitleCase,
} from '@/shared/utils/catalogCsv'

const PAGE_SIZE = 10

function CatalogManagePage({
  title,
  kicker = 'Settings',
  lead,
  singularLabel,
  placeholder,
  fetchItems,
  createItem,
  deleteItem,
  bulkImportItems,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Pagination state (10 items per page)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  // CSV Export & Import state
  const [exporting, setExporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)

  // Bulk Sheet state
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)

  const loadItems = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchItems({ page: targetPage, limit: PAGE_SIZE })
        if (res && res.data && res.pagination) {
          setItems(Array.isArray(res.data) ? res.data : [])
          setPagination(res.pagination)
          setPage(res.pagination.page || targetPage)
        } else if (Array.isArray(res)) {
          // Client-side fallback if unpaginated array returned
          const total = res.length
          const totalPages = Math.ceil(total / PAGE_SIZE) || 1
          const startIndex = (targetPage - 1) * PAGE_SIZE
          setItems(res.slice(startIndex, startIndex + PAGE_SIZE))
          setPagination({ page: targetPage, limit: PAGE_SIZE, total, totalPages })
          setPage(targetPage)
        } else {
          setItems([])
          setPagination(null)
        }
      } catch (err) {
        setItems([])
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [fetchItems, page],
  )

  useEffect(() => {
    loadItems(page)
  }, [loadItems, page])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    loadItems(newPage)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(`${singularLabel} name is required`)
      return
    }

    setSaving(true)
    try {
      await createItem(trimmed)
      setName('')
      toast.success(`${singularLabel} added`)
      await loadItems(1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteItem(pendingDelete.id)
      toast.success(`${singularLabel} deleted`)
      setPendingDelete(null)
      // If we deleted the only item on the current page (and not page 1), move back one page
      const newTargetPage = items.length === 1 && page > 1 ? page - 1 : page
      setPage(newTargetPage)
      await loadItems(newTargetPage)
    } catch (err) {
      toast.error(err.message)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      // Call fetchItems without page parameter to retrieve all items
      const res = await fetchItems()
      const allItems = Array.isArray(res) ? res : res?.data ?? []
      if (allItems.length === 0) {
        toast.error(`No ${title.toLowerCase()} available to export`)
        return
      }
      downloadCatalogCsv(allItems, singularLabel)
      toast.success(`${title} exported successfully`)
    } catch (err) {
      toast.error(err.message || `Failed to export ${title.toLowerCase()}`)
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    downloadCatalogTemplateCsv(singularLabel)
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError(null)

    try {
      const text = await file.text()
      const names = parseCatalogCsv(text, singularLabel)

      if (names.length === 0) {
        throw new Error('No entries found in the uploaded file.')
      }

      if (typeof bulkImportItems !== 'function') {
        throw new Error('Bulk import is not supported for this catalog type.')
      }

      const res = await bulkImportItems(names)
      const data = res.data ?? {}
      const imported = data.importedCount ?? 0
      const skipped = data.skippedCount ?? 0
      const ignored = data.ignoredSampleCount ?? 0

      toast.success(
        `Import complete: ${imported} added, ${skipped} duplicates skipped, ${ignored} template rows ignored.`,
      )
      setImportDialogOpen(false)
      setPage(1)
      await loadItems(1)
    } catch (err) {
      setImportError(err.message)
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleSheetSubmit = async (names) => {
    setSheetSaving(true)
    try {
      if (typeof bulkImportItems !== 'function') {
        throw new Error('Bulk add is not supported for this catalog type.')
      }
      const res = await bulkImportItems(names, 'sheet')
      const data = res.data ?? {}
      const imported = data.importedCount ?? 0
      const skipped = data.skippedCount ?? 0

      toast.success(
        `Bulk add complete: ${imported} added, ${skipped} duplicate(s) skipped.`,
      )
      setSheetDialogOpen(false)
      setPage(1)
      await loadItems(1)
    } catch (err) {
      toast.error(err.message || 'Failed to save sheet items')
    } finally {
      setSheetSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-[1.35rem] max-w-[720px] animate-fade-up">
      <div className="page-header flex flex-wrap items-center sm:items-start justify-between gap-2.5 sm:gap-4">
        <div className="page-header-copy">
          <p className="page-kicker">{kicker}</p>
          <div className="flex items-center gap-2">
            <h1 className="page-title">{title}</h1>
            {pagination && (
              <span className="page-count">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="page-lead">{lead}</p>
        </div>

        {/* Action Buttons for Sheet Bulk Add, CSV Export & Import */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSheetDialogOpen(true)}
            disabled={loading}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg sm:rounded-[10px] border border-border bg-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[0.85rem] font-semibold text-text shadow-xs',
              'transition-[background-color,border-color,color] duration-160 hover:border-[#f0d19a] hover:bg-accent-soft hover:text-accent-text',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            title={`Add multiple ${title.toLowerCase()} using an interactive sheet`}
          >
            <i className="fa-solid fa-table-cells text-xs text-accent" aria-hidden="true" />
            <span className="hidden xs:inline">Bulk Add</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg sm:rounded-[10px] border border-border bg-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[0.85rem] font-semibold text-text shadow-xs',
              'transition-[background-color,border-color,color] duration-160 hover:border-[#f0d19a] hover:bg-accent-soft hover:text-accent-text',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            title={`Export all ${title.toLowerCase()} as CSV`}
          >
            <i
              className={cn('fa-solid text-xs', exporting ? 'fa-spinner fa-spin' : 'fa-download')}
              aria-hidden="true"
            />
            <span className="hidden xs:inline">{exporting ? 'Exporting…' : 'Export'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportError(null)
              setImportDialogOpen(true)
            }}
            disabled={loading}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg sm:rounded-[10px] border border-border bg-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-[0.85rem] font-semibold text-text shadow-xs',
              'transition-[background-color,border-color,color] duration-160 hover:border-[#f0d19a] hover:bg-accent-soft hover:text-accent-text',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            title={`Import ${title.toLowerCase()} from CSV spreadsheet`}
          >
            <i className="fa-solid fa-file-arrow-up text-xs" aria-hidden="true" />
            <span className="hidden xs:inline">Import</span>
          </button>
        </div>
      </div>

      <form
        className="flex flex-col gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-[1.45rem] shadow-xs sm:flex-row sm:items-end"
        onSubmit={handleAdd}
      >
        <div className="form-field m-0 min-w-0 flex-1">
          <label htmlFor="catalog-name">
            Add {singularLabel} <span className="required">*</span>
          </label>
          <input
            id="catalog-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, FIELD_LIMITS.category))}
            placeholder={placeholder}
            maxLength={FIELD_LIMITS.category}
            disabled={saving}
          />
        </div>
        <button
          type="submit"
          className={cn(
            'cursor-pointer rounded-[9px] border-0 bg-accent px-[1.1rem] py-[0.65rem] text-[0.9rem] font-semibold text-white',
            'transition-[background-color,transform] duration-160 hover:bg-accent-hover enabled:active:translate-y-px',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'sm:shrink-0',
          )}
          disabled={saving}
        >
          {saving ? 'Adding…' : `Add ${singularLabel}`}
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-surface p-[1.45rem] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-[0.95rem] font-bold text-text">
            Existing {title}
            {pagination && (
              <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text-secondary">
                {pagination.total}
              </span>
            )}
          </h2>
          {pagination && pagination.totalPages > 1 && (
            <span className="text-xs text-text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total}
            </span>
          )}
        </div>

        {loading && <p className="m-0 text-text-secondary">Loading…</p>}
        {!loading && error && (
          <p className="m-0 text-danger-text" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="m-0 text-text-secondary">
            No {title.toLowerCase()} yet. Add one above or import via CSV to use on products.
          </p>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="m-0 list-none divide-y divide-border p-0">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-[0.75rem] first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate font-medium text-text">{item.name}</span>
                <button
                  type="button"
                  className={cn(
                    'cursor-pointer rounded-[9px] border border-border bg-white px-[0.75rem] py-[0.4rem] text-[0.82rem] font-semibold text-danger-text',
                    'transition-[background-color,border-color] duration-160 hover:border-danger-text/30 hover:bg-danger-bg',
                  )}
                  onClick={() => setPendingDelete(item)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 10-Item Pagination */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <div className="border-t border-border pt-3">
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              loading={loading}
            />
          </div>
        )}
      </section>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${singularLabel}?`}
        message={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? Note: You cannot delete this ${singularLabel.toLowerCase()} if any products are assigned to it.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
      />

      {/* CSV Import Dialog */}
      <CatalogImportDialog
        open={importDialogOpen}
        singularLabel={singularLabel}
        importing={importing}
        error={importError}
        onClose={() => {
          if (!importing) {
            setImportDialogOpen(false)
            setImportError(null)
          }
        }}
        onDownloadTemplate={handleDownloadTemplate}
        onSelectFile={handleImportFile}
      />

      {/* Bulk Add Sheet Dialog */}
      <CatalogSheetAddDialog
        open={sheetDialogOpen}
        singularLabel={singularLabel}
        saving={sheetSaving}
        onClose={() => {
          if (!sheetSaving) setSheetDialogOpen(false)
        }}
        onSubmit={handleSheetSubmit}
      />
    </div>
  )
}

export default CatalogManagePage

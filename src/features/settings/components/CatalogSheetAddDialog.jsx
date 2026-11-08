import { useEffect, useId, useState } from 'react'
import { Dialog } from '@/shared/components/Dialog'
import { FIELD_LIMITS } from '@/shared/constants/fieldLimits'
import { cn } from '@/shared/utils/cn'

const INITIAL_ROW_COUNT = 10

function createEmptyRows(count = INITIAL_ROW_COUNT) {
  return Array.from({ length: Math.max(1, count) }, () => '')
}

function CatalogSheetAddDialog({
  open,
  singularLabel = 'Brand',
  saving = false,
  onClose,
  onSubmit,
}) {
  const titleId = useId()
  const [rows, setRows] = useState(() => createEmptyRows(INITIAL_ROW_COUNT))
  const [error, setError] = useState(null)

  // Reset to 10 rows when dialog opens
  useEffect(() => {
    if (open) {
      setRows(createEmptyRows(INITIAL_ROW_COUNT))
      setError(null)
    }
  }, [open])

  const handleRowChange = (index, value) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = value.slice(0, FIELD_LIMITS.category)
      return next
    })
    if (error) setError(null)
  }

  const handleAddRow = () => {
    setRows((prev) => [...prev, ''])
  }

  const handleAddMultipleRows = (count = 5) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, () => '')])
  }

  const handleRemoveRow = (index) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return ['']
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleClearEmptyRows = () => {
    const filled = rows.filter((r) => r.trim().length > 0)
    setRows(filled.length > 0 ? filled : createEmptyRows(1))
  }

  const handleReset = () => {
    setRows(createEmptyRows(INITIAL_ROW_COUNT))
    setError(null)
  }

  const filledCount = rows.filter((r) => r.trim().length > 0).length

  const handleSubmit = (e) => {
    e.preventDefault()
    const validNames = rows
      .map((r) => r.trim())
      .filter((r) => r.length > 0)

    if (validNames.length === 0) {
      setError(`Please enter at least one ${singularLabel.toLowerCase()} name in the sheet.`)
      return
    }

    setError(null)
    onSubmit(validNames)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-[40rem]"
      disableBackdropClick={saving}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <i className="fa-solid fa-table-cells" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="m-0 font-display text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] text-text">
              Bulk Add {singularLabel}s (Sheet)
            </h2>
            <p className="m-0 mt-0.5 text-xs leading-snug text-text-muted">
              Quickly add 10 or more {singularLabel.toLowerCase()}s in one go without CSV
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
          className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer disabled:opacity-50"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-5 space-y-3.5 max-h-[calc(78vh-7rem)] overflow-y-auto overscroll-contain">
          {/* Quick Info & Row Count badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <i className="fa-solid fa-circle-info text-accent" aria-hidden="true" />
              <span>Auto Title-Cased (Demo) • Gujarati supported • Duplicates skipped</span>
            </div>
            <div className="inline-flex items-center gap-1 font-semibold text-text-secondary">
              <span className="tabular-nums text-text font-bold">{filledCount}</span>
              <span>of</span>
              <span className="tabular-nums">{rows.length}</span>
              <span>filled</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger-text/25 bg-danger-bg p-2.5 text-xs font-semibold text-danger-text" role="alert">
              {error}
            </div>
          )}

          {/* Spreadsheet table sheet */}
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-[0.75rem] font-bold tracking-wider text-text-secondary uppercase">
                  <th scope="col" className="w-12 px-3 py-2 text-center">#</th>
                  <th scope="col" className="px-3 py-2">{singularLabel} Name</th>
                  <th scope="col" className="w-12 px-2 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((rowValue, idx) => (
                  <tr key={idx} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="px-3 py-1.5 text-center text-xs font-medium text-text-muted tabular-nums select-none">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={rowValue}
                        onChange={(e) => handleRowChange(idx, e.target.value)}
                        placeholder={`e.g. ${singularLabel} ${idx + 1}`}
                        maxLength={FIELD_LIMITS.category}
                        disabled={saving}
                        className={cn(
                          'w-full rounded-md border border-border/80 bg-white px-2.5 py-1.5 text-[0.88rem] text-text',
                          'transition-[border-color,box-shadow] duration-140',
                          'focus:border-accent focus:shadow-[0_0_0_2px_rgba(217,119,6,0.18)] focus:outline-none',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={saving}
                        title={`Remove row #${idx + 1}`}
                        className="cursor-pointer inline-flex items-center justify-center size-7 rounded-md text-text-muted hover:text-danger-text hover:bg-danger-bg transition-colors disabled:opacity-40"
                      >
                        <i className="fa-solid fa-trash-can text-xs" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sheet expansion and reduction buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddRow}
                disabled={saving}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-text hover:bg-accent-soft hover:text-accent-text hover:border-[#f0d19a] transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
                Add Row
              </button>
              <button
                type="button"
                onClick={() => handleAddMultipleRows(5)}
                disabled={saving}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-text hover:bg-accent-soft hover:text-accent-text hover:border-[#f0d19a] transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
                Add 5 Rows
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearEmptyRows}
                disabled={saving}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-text-secondary hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
                title="Remove empty rows to reduce sheet size"
              >
                <i className="fa-solid fa-filter text-[10px]" aria-hidden="true" />
                Reduce Empty Rows
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-text-secondary hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
                title="Reset to 10 fresh rows"
              >
                <i className="fa-solid fa-rotate-left text-[10px]" aria-hidden="true" />
                Reset (10 Rows)
              </button>
            </div>
          </div>
        </div>

        {/* Modal footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5 bg-surface max-[480px]:flex-col max-[480px]:*:w-full">
          <span className="text-xs text-text-muted">
            {filledCount > 0 ? `${filledCount} ready to save` : 'Enter names above'}
          </span>
          <div className="flex items-center gap-2 max-[480px]:w-full max-[480px]:flex-col">
            <button
              type="button"
              className="btn-secondary text-[0.88rem] max-[480px]:w-full"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-[0.88rem] max-[480px]:w-full"
              disabled={saving || filledCount === 0}
            >
              <i className={cn('fa-solid', saving ? 'fa-spinner fa-spin' : 'fa-check')} aria-hidden="true" />
              {saving ? 'Saving…' : `Save ${filledCount > 0 ? `(${filledCount})` : ''} ${singularLabel}s`}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}

export default CatalogSheetAddDialog

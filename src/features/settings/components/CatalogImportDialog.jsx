import { useId, useRef } from 'react'
import { Dialog } from '@/shared/components/Dialog'

function CatalogImportDialog({
  open,
  singularLabel = 'Brand',
  importing,
  error,
  onClose,
  onDownloadTemplate,
  onSelectFile,
}) {
  const titleId = useId()
  const inputRef = useRef(null)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      maxWidthClass="max-w-[34rem]"
      disableBackdropClick={importing}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <i className="fa-solid fa-file-csv" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="m-0 font-display text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] text-text">
              Import {singularLabel}s
            </h2>
            <p className="m-0 mt-0.5 text-xs leading-snug text-text-muted">
              Batch upload {singularLabel.toLowerCase()}s via CSV spreadsheet
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={importing}
          aria-label="Close"
          className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer disabled:opacity-50"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[calc(88vh-8rem)] overflow-y-auto overscroll-contain">
        <p className="m-0 text-[0.88rem] leading-relaxed text-text-secondary">
          Download the CSV template, fill in your {singularLabel.toLowerCase()} names, and upload the completed file.
        </p>

        <div className="rounded-xl border border-border bg-surface-muted p-4 space-y-2.5">
          <p className="m-0 text-[0.75rem] font-bold tracking-[0.04em] text-text-secondary uppercase">
            CSV Format & Rules
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">Header Column:</span>
            <code className="rounded-md border border-border bg-white px-2 py-0.5 text-[0.75rem] font-mono text-text font-semibold">
              {singularLabel} Name
            </code>
          </div>
          <ul className="m-0 pl-4 space-y-1.5 text-[0.78rem] text-text-muted list-disc">
            <li>
              <strong>Template Rows Ignored:</strong> Any sample placeholder rows (like <em>Sample {singularLabel} 1</em>) in the template will be automatically skipped during import.
            </li>
            <li>
              <strong>Case-Insensitive & Title Case:</strong> Names like <code className="text-text font-mono">Demo</code>, <code className="text-text font-mono">DEMO</code>, <code className="text-text font-mono">demo</code>, or <code className="text-text font-mono">dEMo</code> are recognized as the same item and automatically saved as <strong>Title Case</strong> (<code className="text-text font-mono">Demo</code>).
            </li>
            <li>
              <strong>Gujarati / Multilingual Supported:</strong> You can enter names in Gujarati (e.g. <em>શેરવાની</em>, <em>ચણિયા ચોળી</em>) and they will be safely preserved.
            </li>
            <li>
              <strong>Character Limit:</strong> Up to 20 characters per {singularLabel.toLowerCase()} name.
            </li>
          </ul>
        </div>

        {error && (
          <p className="m-0 text-[0.82rem] font-semibold text-danger-text" role="alert">
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={importing}
          onChange={(event) => {
            onSelectFile(event)
            event.target.value = ''
          }}
        />

        <div className="flex flex-wrap justify-end gap-2.5 pt-3 border-t border-border max-[480px]:flex-col max-[480px]:*:w-full">
          <button
            type="button"
            className="btn-secondary text-[0.88rem] max-[480px]:order-2"
            disabled={importing}
            onClick={onDownloadTemplate}
          >
            <i className="fa-solid fa-download" aria-hidden="true" />
            Download Template CSV
          </button>
          <button
            type="button"
            className="btn-primary text-[0.88rem] max-[480px]:order-1"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
          >
            <i className="fa-solid fa-file-arrow-up" aria-hidden="true" />
            {importing ? 'Importing…' : 'Choose CSV File'}
          </button>
          <button
            type="button"
            className="btn-secondary text-[0.88rem] max-[480px]:order-3"
            disabled={importing}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default CatalogImportDialog

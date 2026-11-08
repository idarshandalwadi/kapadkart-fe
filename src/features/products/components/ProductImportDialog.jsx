import { useId, useRef } from 'react'
import { Dialog } from '@/shared/components/Dialog'
import { getProductCsvHeaders } from '@/features/products/utils/productCsv'

function ProductImportDialog({
  open,
  businessType = 'SALES_AND_RENTAL',
  importing,
  error,
  onClose,
  onDownloadSample,
  onSelectFile,
}) {
  const titleId = useId()
  const inputRef = useRef(null)
  const normType = String(businessType || '').toUpperCase()
  const headers = getProductCsvHeaders(normType)

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
              Import Products
            </h2>
            <p className="m-0 mt-0.5 text-xs leading-snug text-text-muted">
              Upload multiple items via CSV spreadsheet ({normType === 'SALES' ? 'Sales Only' : normType === 'RENTAL' ? 'Rental Only' : 'Rental & Sales'})
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
          Download the sample, keep the same column names, add your product rows, then upload the
          completed CSV.
        </p>

        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="m-0 text-[0.75rem] font-bold tracking-[0.04em] text-text-secondary uppercase">
            CSV columns In order (Left to Right)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {headers.map((header) => (
              <code
                key={header}
                className="rounded-md border border-border bg-white px-2 py-0.5 text-[0.72rem] font-mono text-text font-medium"
              >
                {header}
              </code>
            ))}
          </div>
          <p className="mt-3 mb-0 text-[0.78rem] text-text-muted">
            Product name, code, and quantity are required. Status is set automatically from
            quantity (greater than 0 → Available, otherwise Out of Stock).
          </p>
          {normType === 'SALES' && (
            <p className="mt-2 mb-0 text-[0.78rem] text-text-muted">
              <strong>Shop Type: Sales Only.</strong> Specify <strong>sale_price</strong> for each product. Rental rate and availability types are not required.
            </p>
          )}
          {normType === 'RENTAL' && (
            <p className="mt-2 mb-0 text-[0.78rem] text-text-muted">
              <strong>Shop Type: Rental Only.</strong> Specify <strong>daily_rent</strong> for each product. Sale price and availability types are not required.
            </p>
          )}
          {normType !== 'SALES' && normType !== 'RENTAL' && (
            <p className="mt-2 mb-0 text-[0.78rem] text-text-muted">
              <strong>Shop Type: Rental & Sales.</strong> <strong>availability_type</strong>: <code className="rounded px-1.5 py-0.5 bg-white border border-border text-[0.7rem] font-mono">rent</code>{' '}
              <code className="rounded px-1.5 py-0.5 bg-white border border-border text-[0.7rem] font-mono">sell</code>{' '}
              <code className="rounded px-1.5 py-0.5 bg-white border border-border text-[0.7rem] font-mono">both</code>{' '}— defaults to <em>both</em> if blank.
              Set <strong>sale_price</strong> for sell/both; set <strong>daily_rent</strong> for rent/both.
            </p>
          )}
          <p className="mt-2 mb-0 text-[0.78rem] text-text-muted">
            Brand and category are matched case-insensitively. New brands and categories are created automatically if they do not exist.
          </p>
          <p className="mt-2 mb-0 text-[0.78rem] font-semibold text-warning-text">
            If a product code already exists, that row will be skipped and not uploaded.
          </p>
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
            onClick={onDownloadSample}
          >
            <i className="fa-solid fa-download" aria-hidden="true" />
            Download Sample CSV
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

export default ProductImportDialog

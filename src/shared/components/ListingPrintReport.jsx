import './ListingPrintReport.css'
import { formatDateDisplay } from '@/shared/utils/dateFormat'
import { createPortal } from 'react-dom'

function formatFilterDate(value) {
  if (!value) return ''
  const parts = String(value).split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return formatDateDisplay(value)
}

export function formatListingRangeLabel(from, to) {
  if (from && to) return `${formatFilterDate(from)} – ${formatFilterDate(to)}`
  if (from) return `From ${formatFilterDate(from)}`
  if (to) return `Until ${formatFilterDate(to)}`
  return 'All dates'
}

function ListingPrintReport({
  title,
  settings,
  from,
  to,
  extraFilters,
  columns,
  rows,
  totals,
}) {
  const company = settings?.company_name || 'KapadKart'
  const rangeLabel = formatListingRangeLabel(from, to)
  const printedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const content = (
    <div className="listing-print-report" aria-hidden="true">
      <header className="listing-print-header">
        <div>
          <h1>{company}</h1>
          {settings?.address && <p>{settings.address}</p>}
          {settings?.phone_number && <p>{settings.phone_number}</p>}
        </div>
        <div className="listing-print-meta">
          <p className="listing-print-title">{title}</p>
          <p>
            <strong>Period:</strong> {rangeLabel}
          </p>
          {extraFilters ? (
            <p>
              <strong>Filters:</strong> {extraFilters}
            </p>
          ) : null}
          <p>
            <strong>Printed:</strong> {printedOn}
          </p>
          <p>
            <strong>Records:</strong> {rows.length}
          </p>
        </div>
      </header>

      <table className="listing-print-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'right' ? 'is-num' : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? 'is-num' : undefined}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals?.length ? (
          <tfoot>
            <tr>
              {totals.map((cell, index) => (
                <td
                  key={columns[index]?.key || index}
                  className={columns[index]?.align === 'right' ? 'is-num' : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}

export default ListingPrintReport

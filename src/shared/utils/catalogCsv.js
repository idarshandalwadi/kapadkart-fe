/**
 * CSV import and export helpers for Brands and Categories in KapadKart.
 * Supports Unicode, Gujarati script, and standard Latin scripts.
 * Adheres to RFC 4180 with UTF-8 BOM (\uFEFF) for Excel compatibility.
 */

/**
 * Unicode-aware Title Casing.
 * Capitalizes the first letter of each word and lowercases the remainder.
 * For scripts without case distinctions (such as Gujarati, Hindi, etc.),
 * characters remain completely intact.
 */
export function toTitleCase(input) {
  if (!input || typeof input !== 'string') return ''
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      return word.replace(/^(\W*)(\p{L})(.*)$/u, (_, prefix, firstLetter, rest) => {
        return prefix + firstLetter.toLocaleUpperCase() + rest.toLocaleLowerCase()
      })
    })
    .join(' ')
}

export function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/**
 * Checks whether a row is a placeholder or template example.
 * Template rows containing words like "(Sample)", "(Example)", "(Template)",
 * or starting with "Sample " / "Demo " from template files are ignored.
 */
export function isSampleCatalogRow(name) {
  if (!name || typeof name !== 'string') return true
  const lower = name.trim().toLowerCase()
  return (
    lower.includes('(sample)') ||
    lower.includes('(example)') ||
    lower.includes('(template)') ||
    lower.includes('sample brand') ||
    lower.includes('sample category') ||
    lower.startsWith('sample ') ||
    lower === 'sample' ||
    lower === 'template' ||
    lower === 'example'
  )
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

export function downloadCsvWithBom(csvContent, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function generateCatalogCsv(items = [], singularLabel = 'Brand') {
  const header = `${singularLabel} Name`
  const lines = [
    escapeCsv(header),
    ...items.map((item) => escapeCsv(item.name || item)),
  ]
  return lines.join('\n')
}

export function downloadCatalogCsv(items = [], singularLabel = 'Brand', filename) {
  const csv = generateCatalogCsv(items, singularLabel)
  const defaultName = `${singularLabel.toLowerCase()}s-${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsvWithBom(csv, filename || defaultName)
}

export function generateCatalogTemplateCsv(singularLabel = 'Brand') {
  const header = `${singularLabel} Name`
  const sample1 = `Sample ${singularLabel} 1 (Example - ignored on import)`
  const sample2 = `Sample ${singularLabel} 2 (Example - ignored on import)`
  const lines = [
    escapeCsv(header),
    escapeCsv(sample1),
    escapeCsv(sample2),
  ]
  return lines.join('\n')
}

export function downloadCatalogTemplateCsv(singularLabel = 'Brand') {
  const csv = generateCatalogTemplateCsv(singularLabel)
  const filename = `${singularLabel.toLowerCase()}-import-template.csv`
  downloadCsvWithBom(csv, filename)
}

/**
 * Parses uploaded CSV text, extracts brand/category names.
 */
export function parseCatalogCsv(text, singularLabel = 'Brand') {
  const lines = String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 1) {
    throw new Error('CSV file is empty.')
  }

  const rawHeader = lines[0]
  const headerCells = parseCsvLine(rawHeader).map((c) => c.trim().toLowerCase())
  const expectedLabels = [
    `${singularLabel.toLowerCase()} name`,
    singularLabel.toLowerCase(),
    'name',
    'title',
    'value',
  ]

  const hasMatchingHeader = headerCells.some((cell) =>
    expectedLabels.includes(cell.replace(/["_]/g, ' ').trim()),
  )

  let dataLines = lines
  let colIndex = 0

  if (hasMatchingHeader) {
    colIndex = headerCells.findIndex((cell) =>
      expectedLabels.includes(cell.replace(/["_]/g, ' ').trim()),
    )
    if (colIndex < 0) colIndex = 0
    dataLines = lines.slice(1)
  }

  if (dataLines.length === 0) {
    throw new Error('CSV file contains no data rows.')
  }

  const names = []
  for (const line of dataLines) {
    const cells = parseCsvLine(line)
    const val = (cells[colIndex] ?? cells[0] ?? '').trim()
    if (val) {
      names.push(val)
    }
  }

  return names
}

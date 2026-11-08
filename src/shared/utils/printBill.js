/**
 * Build / apply the print/PDF document name: CustomerName_BillNO_Date
 */

export function sanitizePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function formatBillDate(value) {
  const date = value ? new Date(value) : new Date()
  const safe = Number.isNaN(date.getTime()) ? new Date() : date
  const dd = String(safe.getDate()).padStart(2, '0')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const mon = months[safe.getMonth()]
  const yyyy = safe.getFullYear()
  return `${dd}${mon}${yyyy}`
}

/**
 * @param {{
 *   customerName?: string | null,
 *   billNo?: string | null,
 *   date?: string | Date | null,
 * }} parts
 */
export function buildBillFileName({ customerName, billNo, date } = {}) {
  const name = sanitizePart(customerName) || 'Customer'
  const bill = sanitizePart(billNo) || 'Bill'
  const day = formatBillDate(date)
  return `${name}_${bill}_${day}`
}

/**
 * Wait for all images inside the active print container to finish loading and decoding.
 * Prevents race conditions where window.print() opens before image bytes are ready in memory.
 */
async function waitForPrintImagesReady(timeoutMs = 6000) {
  if (typeof document === 'undefined') return

  // Query all active print containers in the DOM
  const printContainers = document.querySelectorAll(
    '.booking-bill-print, .sale-bill-print, .listing-print-report'
  )
  if (!printContainers.length) return

  const imgElements = []
  printContainers.forEach((container) => {
    imgElements.push(...Array.from(container.querySelectorAll('img')))
  })

  if (!imgElements.length) return

  const imagePromises = imgElements.map((img) => {
    if (!img.src) return Promise.resolve()

    // If already complete with dimensions, try decoding
    if (img.complete && img.naturalHeight !== 0) {
      if (typeof img.decode === 'function') {
        return img.decode().catch(() => {})
      }
      return Promise.resolve()
    }

    // Otherwise, wait for load/error with safety timeout
    return new Promise((resolve) => {
      let resolved = false
      const done = () => {
        if (resolved) return
        resolved = true
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {}).finally(resolve)
        } else {
          resolve()
        }
      }

      img.addEventListener('load', done, { once: true })
      img.addEventListener('error', done, { once: true })
      setTimeout(done, timeoutMs)
    })
  })

  await Promise.all(imagePromises)

  // Allow browser layout engine two animation frames to calculate geometry with loaded images
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )
}

/**
 * Temporarily set document.title so "Save as PDF" uses CustomerName_BillNO_Date,
 * then restore the previous title after printing.
 *
 * @param {{
 *   customerName?: string | null,
 *   billNo?: string | null,
 *   date?: string | Date | null,
 * }} parts
 */
export async function printBill(parts = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const previousTitle = document.title
  const nextTitle = buildBillFileName(parts)
  document.title = nextTitle

  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    document.title = previousTitle
    window.removeEventListener('afterprint', restore)
  }

  window.addEventListener('afterprint', restore)

  try {
    // Wait for all invoice logo & product images to be decoded before opening print
    await waitForPrintImagesReady()
  } catch {
    // Graceful fallback to proceed if image decoding encounters an error
  }

  window.print()
  window.setTimeout(restore, 60_000)
}

/**
 * Print a filtered bookings/sales listing. Uses landscape A4 and hides individual bills.
 */
export function printListingReport({ title, from, to } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const pageStyle = document.createElement('style')
  pageStyle.setAttribute('data-listing-print', '')
  pageStyle.textContent = '@page { size: A4 landscape; margin: 8mm; }'
  document.head.appendChild(pageStyle)
  document.documentElement.classList.add('listing-print-only')
  document.body.classList.add('listing-print-only')

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    document.documentElement.classList.remove('listing-print-only')
    document.body.classList.remove('listing-print-only')
    pageStyle.remove()
    window.removeEventListener('afterprint', cleanup)
  }

  // Attach the listener BEFORE calling printBill (which triggers the blocking window.print())
  window.addEventListener('afterprint', cleanup)
  window.setTimeout(cleanup, 60_000)

  printBill({
    customerName: title || 'Listing',
    billNo: from && to ? `${from}_to_${to}` : 'All',
    date: new Date(),
  })
}

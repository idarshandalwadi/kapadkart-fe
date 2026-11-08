/**
 * Determines whether a plan limit is active (a positive finite number).
 * Null, undefined, empty string, or non-positive values denote an unlimited plan quota.
 * @param {number|string|null|undefined} limit
 * @returns {boolean}
 */
export function isLimitActive(limit) {
  if (limit === null || limit === undefined || limit === '') return false
  const num = Number(limit)
  return Number.isFinite(num) && num > 0
}

/**
 * Checks if a tenant has any active limit across their allowed business modules.
 * @param {object} params
 * @param {number|string|null|undefined} params.maxProducts
 * @param {number|string|null|undefined} params.maxBookings
 * @param {number|string|null|undefined} params.maxSales
 * @param {boolean} [params.isRentalAllowed=true]
 * @param {boolean} [params.isSalesAllowed=true]
 * @returns {boolean}
 */
export function hasAnyActiveLimit({
  maxProducts,
  maxBookings,
  maxSales,
  isRentalAllowed = true,
  isSalesAllowed = true,
} = {}) {
  const hasProductLimit = isLimitActive(maxProducts)
  const hasBookingLimit = Boolean(isRentalAllowed && isLimitActive(maxBookings))
  const hasSalesLimit = Boolean(isSalesAllowed && isLimitActive(maxSales))
  return hasProductLimit || hasBookingLimit || hasSalesLimit
}


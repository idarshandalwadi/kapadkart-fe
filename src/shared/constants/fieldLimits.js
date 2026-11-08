/** Max character counts (spaces included). Keep in sync with the API / database. */
export const FIELD_LIMITS = {
  product_name: 60,
  color: 20,
  size: 20,
  product_code: 20,
  category: 20,
  brand: 20,
  description: 1200,
  customer_name: 60,
  village_address: 100,
  choyani: 20,
  pant: 20,
  sol: 20,
  mojdi: 255,
  other_items: 100,
  notes: 400,
  company_name: 100,
  address: 200,
  whatsapp_url: 150,
  instagram_link: 150,
  facebook_url: 150,
  terms_and_conditions: 400,
}

export function applyFieldLimit(name, value, limits = FIELD_LIMITS) {
  const max = limits[name]
  if (max == null) return value
  return String(value ?? '').slice(0, max)
}

export function maxLengthMessage(label, max) {
  return `${label} must be ${max} characters or fewer`
}

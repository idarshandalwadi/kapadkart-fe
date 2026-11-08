/** Shared defaults for the common billing template (all tenants). */
export const DEFAULT_BILL_TEMPLATE = {
  bill_show_logo: true,
  bill_show_signature: true,
  bill_rental_title: 'Rental Bill',
  bill_sale_title: 'Sale Bill',
  bill_header_note: '',
  bill_footer_note: '',
}

export function getBillTemplateConfig(settings = {}) {
  const safe = settings || {}
  return {
    showLogo: safe.bill_show_logo !== false,
    showSignature: safe.bill_show_signature !== false,
    rentalTitle:
      String(safe.bill_rental_title || DEFAULT_BILL_TEMPLATE.bill_rental_title).trim() ||
      DEFAULT_BILL_TEMPLATE.bill_rental_title,
    saleTitle:
      String(safe.bill_sale_title || DEFAULT_BILL_TEMPLATE.bill_sale_title).trim() ||
      DEFAULT_BILL_TEMPLATE.bill_sale_title,
    headerNote: String(safe.bill_header_note || '').trim(),
    footerNote: String(safe.bill_footer_note || '').trim(),
  }
}

export const SAMPLE_RENTAL_BILL_FORM = {
  customer_name: 'Sample Customer',
  phone_number: '9876543210',
  village_address: 'Sample Village, Surat',
  status: 'reserved',
  use_date: new Date().toISOString(),
  return_date: new Date(Date.now() + 86400000).toISOString(),
  rental_days: 1,
  choyani: '1',
  mojdi: 'Given',
  pant: '32',
  sol: 'Gold',
  accessories_price: 200,
  line_items: [
    {
      key: 'sample-1',
      product_name: 'Sherwani Set',
      product_code: 'SH-101',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop&q=80',
      quantity: 1,
      unit_price: 1500,
    },
  ],
  subtotal: 1700,
  discount_amount: 200,
  tax_rate: 18,
  tax_amount: 270,
  rental_total: 1970,
  security_deposit: 500,
  paid_amount: 1000,
  due_amount: 770,
  notes: '',
}

export const SAMPLE_SALE_BILL_FORM = {
  customer_name: 'Sample Customer',
  phone_number: '9876543210',
  village_address: 'Sample Village, Surat',
  status: 'completed',
  created_at: new Date().toISOString(),
  choyani: '1',
  mojdi: 'Given',
  pant: '32',
  sol: 'Gold',
  accessories_price: 200,
  line_items: [
    {
      key: 'sample-1',
      product_name: 'Kurta Pair',
      product_code: 'KP-12',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=80',
      quantity: 2,
      unit_price: 800,
    },
  ],
  subtotal: 1600,
  discount_amount: 100,
  tax_rate: 18,
  tax_amount: 270,
  sale_total: 1770,
  paid_amount: 1500,
  due_amount: 270,
  notes: '',
}

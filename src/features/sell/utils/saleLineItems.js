import {
  calcLineTotal,
  calcTotalQuantity,
  normalizeLineItem,
  roundMoney,
} from '@/features/bookings/utils/bookingLineItems'

export function createSaleLineItem(product, quantity = 1, customPrice = null) {
  const qty = Math.max(1, Math.trunc(Number(quantity) || 1))
  const rawPrice = customPrice !== null && customPrice !== undefined && customPrice !== ''
    ? Number(customPrice)
    : Number(product.sale_price)
  const unitPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? roundMoney(rawPrice) : ''

  return {
    key: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: product.id,
    product_code: product.product_code || '',
    product_name: product.product_name || product.name || 'Product',
    image: product.image || product.image_url || null,
    image_url: product.image || product.image_url || null,
    product_image: product.image || product.image_url || null,
    product: product || null,
    quantity: qty,
    unit_price: unitPrice,
    line_total: calcLineTotal(qty, Number(unitPrice) || 0),
    max_quantity: Number(product.available_quantity ?? product.quantity) || qty,
  }
}

export function calcSaleAmounts({
  items = [],
  discountAmount = null,
  taxRate = 0,
  taxAmount = null,
  paidAmount = null,
} = {}) {
  const totalQuantity = calcTotalQuantity(items)
  const productsSubtotal = (items || []).reduce((sum, item) => {
    const q = Math.max(1, Math.trunc(Number(item.quantity) || 1))
    const p = Math.max(0, Number(item.unit_price) || 0)
    return sum + roundMoney(q * p)
  }, 0)

  const subtotal = roundMoney(productsSubtotal)
  const rate = Math.max(0, Number(taxRate) || 0)
  const grossTax = roundMoney((subtotal * rate) / 100)
  const grossTotal = roundMoney(subtotal + grossTax)

  let discount = 0
  let paid = grossTotal
  let finalTax = grossTax
  let netSaleTotal = grossTotal

  if (paidAmount !== null && paidAmount !== undefined && paidAmount !== '') {
    const rawPaid = Math.max(0, roundMoney(paidAmount))
    if (rawPaid < grossTotal) {
      paid = rawPaid
      if (rate > 0) {
        const taxableSubtotal = roundMoney(rawPaid / (1 + rate / 100))
        finalTax = roundMoney(rawPaid - taxableSubtotal)
        discount = Math.max(0, roundMoney(subtotal - taxableSubtotal))
      } else {
        discount = roundMoney(grossTotal - rawPaid)
        finalTax = 0
      }
      netSaleTotal = rawPaid
    } else {
      if (discountAmount !== null && discountAmount !== undefined && discountAmount !== '' && Number(discountAmount) > 0) {
        discount = Math.min(Math.max(0, roundMoney(discountAmount)), subtotal)
      } else {
        discount = 0
      }
      const taxableSubtotal = Math.max(0, subtotal - discount)
      finalTax = roundMoney((taxableSubtotal * rate) / 100)
      netSaleTotal = roundMoney(taxableSubtotal + finalTax)
      paid = netSaleTotal
    }
  } else if (discountAmount !== null && discountAmount !== undefined && discountAmount !== '' && Number(discountAmount) > 0) {
    discount = Math.min(Math.max(0, roundMoney(discountAmount)), subtotal)
    const taxableSubtotal = Math.max(0, subtotal - discount)
    finalTax = roundMoney((taxableSubtotal * rate) / 100)
    netSaleTotal = roundMoney(taxableSubtotal + finalTax)
    paid = netSaleTotal
  }

  const dueAmount = 0

  // Item-level breakdown: calculate proportional discount, GST, and final price per product
  const breakdownItems = (items || []).map((item) => {
    const q = Math.max(1, Math.trunc(Number(item.quantity) || 1))
    const p = Math.max(0, Number(item.unit_price) || 0)
    const itemGross = roundMoney(q * p)
    const itemDiscount = subtotal > 0 ? roundMoney((discount * itemGross) / subtotal) : 0
    const itemTaxable = Math.max(0, itemGross - itemDiscount)
    const itemTax = rate > 0 ? roundMoney((itemTaxable * rate) / 100) : 0
    const itemTotal = roundMoney(itemTaxable + itemTax)

    return {
      ...item,
      quantity: q,
      unit_price: p,
      gross_amount: itemGross,
      discount_amount: itemDiscount,
      taxable_amount: itemTaxable,
      tax_amount: itemTax,
      total_amount: itemTotal,
    }
  })

  return {
    total_quantity: totalQuantity,
    products_subtotal: productsSubtotal,
    subtotal,
    discount_amount: discount,
    tax_rate: rate,
    tax_amount: finalTax,
    sale_total: netSaleTotal,
    paid_amount: paid,
    due_amount: dueAmount,
    breakdown_items: breakdownItems,
  }
}

export { normalizeLineItem, calcLineTotal, calcTotalQuantity, roundMoney }


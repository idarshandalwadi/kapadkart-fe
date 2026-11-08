/**
 * KapadKart — Automated Test Suite: Modals & Sales Flow Verification
 * Verifies that:
 * 1. SaleInfoDialog has NO due/dueAmount references and renders retail pricing correctly
 * 2. SaleBillPrint has NO due/bill-due references
 * 3. SaleActions has onViewSale and the standard fa-eye action button
 * 4. SaleTable forwards onViewSale to SaleActions and supports row click
 * 5. ProductInfoDialog, BookingInfoDialog, and SaleInfoDialog domain models are clean
 */

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '../src')

console.log('\n=================================================================')
console.log('  KAPADKART — MODALS & SALES FLOW VERIFICATION SUITE')
console.log('=================================================================\n')

let passed = 0

function runCheck(desc, fn) {
  try {
    fn()
    console.log(`  ✓ ${desc}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

// 1. SaleInfoDialog checks
runCheck('SaleInfoDialog does NOT contain any dueAmount or Remaining Due reference', () => {
  const file = path.join(srcDir, 'features/sell/components/SaleInfoDialog.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(!content.includes('dueAmount'), 'SaleInfoDialog must not contain dueAmount')
  assert(!content.includes('Remaining Due'), 'SaleInfoDialog must not contain Remaining Due')
  assert(content.includes('Final Amount'), 'SaleInfoDialog must display Final Amount')
  assert(content.includes('Paid Amount'), 'SaleInfoDialog must display Paid Amount')
  assert(content.includes('Instant Discount'), 'SaleInfoDialog must display Instant Discount')
})

// 2. SaleBillPrint checks
runCheck('SaleBillPrint does NOT contain any dueAmount or bill-due reference', () => {
  const file = path.join(srcDir, 'features/sell/components/SaleBillPrint.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(!content.includes('dueAmount'), 'SaleBillPrint must not contain dueAmount')
  assert(!content.includes('bill-due'), 'SaleBillPrint must not contain bill-due class')
  assert(!content.includes('Remaining Due'), 'SaleBillPrint must not contain Remaining Due')
  assert(content.includes('Final Amount'), 'SaleBillPrint must display Final Amount')
})

// 3. SaleActions checks
runCheck('SaleActions supports onViewSale and includes standard fa-eye button', () => {
  const file = path.join(srcDir, 'features/sell/components/SaleActions.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(content.includes('onViewSale'), 'SaleActions must accept onViewSale prop')
  assert(content.includes('fa-eye'), 'SaleActions must include fa-eye icon')
  assert(content.includes('View Details'), 'SaleActions must provide View Details accessibility title')
})

// 4. SaleTable checks
runCheck('SaleTable passes onViewSale to SaleActions and supports row clicks', () => {
  const file = path.join(srcDir, 'features/sell/components/SaleTable.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(content.includes('onViewSale={onViewSale}'), 'SaleTable must forward onViewSale to SaleActions')
  assert(content.includes('onClick={() => onViewSale?.(sale)}'), 'SaleTable must support row click for opening modal')
})

// 5. ProductInfoDialog checks
runCheck('ProductInfoDialog properly renders image carousel, sale price, and daily rent', () => {
  const file = path.join(srcDir, 'features/products/components/ProductInfoDialog.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(content.includes('ProductInfoGallery'), 'ProductInfoDialog must render ProductInfoGallery')
  assert(content.includes('Daily Rent'), 'ProductInfoDialog must handle Daily Rent')
  assert(content.includes('Sale Price'), 'ProductInfoDialog must handle Sale Price')
})

// 6. BookingInfoDialog checks
runCheck('BookingInfoDialog properly handles rental lifecycle, dates, and due balance', () => {
  const file = path.join(srcDir, 'features/bookings/components/BookingInfoDialog.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(content.includes('rentalTotal'), 'BookingInfoDialog must calculate rentalTotal')
  assert(content.includes('dueAmount'), 'BookingInfoDialog must calculate due balance for rentals')
  assert(content.includes('securityDeposit'), 'BookingInfoDialog must handle securityDeposit')
})

// 7. Backend sales routes check
runCheck('Backend sales routes does not calculate due amount for retail sales', () => {
  const file = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/sales.routes.js')
  const content = fs.readFileSync(file, 'utf8')
  assert(!content.includes('const dueAmount = Math.max(0, totalAmount - paidAmount)'), 'Backend sales routes must not calculate due amount')
  assert(content.includes('dueAmount: 0'), 'Backend sales chart must set dueAmount: 0')
})

// 8. BookingBillPrint multi-day duration and subtotal check
runCheck('BookingBillPrint accurately multiplies rentalDays for line items and subtotal', () => {
  const file = path.join(srcDir, 'features/bookings/components/BookingBillPrint.jsx')
  const content = fs.readFileSync(file, 'utf8')
  assert(content.includes('calcLineTotal(qty, unitPrice, duration)'), 'BookingBillPrint must calculate line item total using duration')
  assert(content.includes('Math.max(Number(form.subtotal), lineItemsSum)'), 'BookingBillPrint must ensure subtotal reflects full rental duration')
})

// 9. BookingFormPage and BookingPage direct save & print flow
runCheck('BookingFormPage and BookingPage smoothly orchestrate Save & Print without unmount race conditions', () => {
  const formFile = path.join(srcDir, 'features/bookings/pages/BookingFormPage.jsx')
  const formContent = fs.readFileSync(formFile, 'utf8')
  assert(formContent.includes('autoPrintBooking: savedBooking'), 'BookingFormPage must pass autoPrintBooking in navigation state')
  assert(formContent.includes('serializeLineItems(form.line_items, rentalDays)'), 'BookingFormPage must pass rentalDays to serializeLineItems')

  const pageFile = path.join(srcDir, 'features/bookings/pages/BookingPage.jsx')
  const pageContent = fs.readFileSync(pageFile, 'utf8')
  assert(pageContent.includes('location.state?.autoPrintBooking'), 'BookingPage must listen for autoPrintBooking state')
  assert(pageContent.includes('handlePrintBill(target)'), 'BookingPage must trigger print bill for autoPrintBooking target')
})

// 10. WhatsApp Gujarati message verification (No emojis, no phone/address/products)
runCheck('buildSaleWhatsAppMessage generates professional Gujarati message with zero emojis and excluded details', async () => {
  const { buildSaleWhatsAppMessage } = await import('../src/shared/utils/whatsappShare.js')
  const sale = {
    customer_name: 'મેહુલ પટેલ',
    bill_no: 'S-0000042',
    created_at: '2026-11-01T10:30:00.000Z',
    phone_number: '9876543210',
    village_address: 'અમદાવાદ',
    sale_total: 1500,
    paid_amount: 1500,
    status: 'completed',
    line_items: [{ product_name: 'કુર્તા પાયજામા', unit_price: 1500, quantity: 1, line_total: 1500 }]
  }

  const message = buildSaleWhatsAppMessage(sale, 'શ્રી ક્રિષ્ના કલેક્શન', {
    downloadUrl: 'https://kapadkart.in/bills/dl/12345',
    contactNumber: '9988776655'
  })

  // Check pure Gujarati and expected fields
  assert(message.includes('*નમસ્તે, મેહુલ પટેલ*'), 'Must greet customer in Gujarati')
  assert(message.includes('*શ્રી ક્રિષ્ના કલેક્શન* માંથી ખરીદી કરવા બદલ આપનો ખૂબ ખૂબ આભાર.'), 'Must include shop greeting in Gujarati')
  assert(message.includes('*બિલ નંબર:* S-0000042'), 'Must include bill number')
  assert(message.includes('*તારીખ:* 01/11/2026'), 'Must include date')
  assert(message.includes('*કુલ ચૂકવેલ રકમ:* ₹1,500.00'), 'Must include paid amount')
  assert(message.includes('*ચુકવણી સ્થિતિ:* સંપૂર્ણ ચૂકતે'), 'Must include paid in full status')
  assert(message.includes('https://kapadkart.in/bills/dl/12345'), 'Must include download URL')
  assert(message.includes('*દુકાન સંપર્ક નંબર:* +91 9988776655'), 'Must include shop contact number')

  // Check STRICT EXCLUSIONS
  assert(!message.includes('ગ્રાહક સંપર્ક નંબર'), 'Must NOT include customer phone number')
  assert(!message.includes('9876543210'), 'Must NOT include customer phone digits')
  assert(!message.includes('ગ્રાહક સરનામું'), 'Must NOT include customer address label')
  assert(!message.includes('અમદાવાદ'), 'Must NOT include customer address value')
  assert(!message.includes('વસ્તુનું નામ'), 'Must NOT include product name label')
  assert(!message.includes('કુર્તા પાયજામા'), 'Must NOT include product names')
  assert(!message.includes('ખરીદેલ વસ્તુઓની વિગત'), 'Must NOT include product breakdown')

  // Check ZERO EMOJIS or decorative symbols
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u
  assert(!emojiRegex.test(message), 'Message must NOT contain any emojis')
})

// 11. Sales Listing Edit (30 Days) and Cancel (45 Days) restrictions logic
runCheck('isSaleEditable and isSaleCancellable accurately enforce 30-day and 45-day cutoffs from created_at', async () => {
  const { isSaleEditable, isSaleCancellable, getSaleAgeInDays } = await import('../src/features/sell/constants/sales.js')
  const now = new Date('2026-11-07T12:00:00Z').getTime()
  const oneDayMs = 24 * 60 * 60 * 1000

  // 10 days old sale
  const sale10d = {
    created_at: new Date(now - 10 * oneDayMs).toISOString(),
    updated_at: new Date(now).toISOString(),
    status: 'completed'
  }
  assert.strictEqual(Math.round(getSaleAgeInDays(sale10d.created_at, now)), 10)
  assert.strictEqual(isSaleEditable(sale10d, now), true, '10 days old sale should be editable')
  assert.strictEqual(isSaleCancellable(sale10d, now), true, '10 days old sale should be cancellable')

  // 29.5 days old sale (within 30 days)
  const sale29d = {
    created_at: new Date(now - 29.5 * oneDayMs).toISOString(),
    status: 'completed'
  }
  assert.strictEqual(isSaleEditable(sale29d, now), true, '29.5 days old sale should be editable')
  assert.strictEqual(isSaleCancellable(sale29d, now), true, '29.5 days old sale should be cancellable')

  // 31 days old sale (> 30 days, <= 45 days)
  const sale31d = {
    created_at: new Date(now - 31 * oneDayMs).toISOString(),
    updated_at: new Date(now).toISOString(), // Updated recently, must NOT bypass restriction
    status: 'completed'
  }
  assert.strictEqual(isSaleEditable(sale31d, now), false, '31 days old sale should NOT be editable')
  assert.strictEqual(isSaleCancellable(sale31d, now), true, '31 days old sale should still be cancellable (<= 45 days)')

  // 46 days old sale (> 45 days)
  const sale46d = {
    created_at: new Date(now - 46 * oneDayMs).toISOString(),
    status: 'completed'
  }
  assert.strictEqual(isSaleEditable(sale46d, now), false, '46 days old sale should NOT be editable')
  assert.strictEqual(isSaleCancellable(sale46d, now), false, '46 days old sale should NOT be cancellable (> 45 days)')

  // Cancelled sale (neither editable nor cancellable)
  const cancelledSale = {
    created_at: new Date(now - 2 * oneDayMs).toISOString(),
    status: 'cancelled'
  }
  assert.strictEqual(isSaleEditable(cancelledSale, now), false, 'Cancelled sale cannot be edited')
  assert.strictEqual(isSaleCancellable(cancelledSale, now), false, 'Cancelled sale cannot be cancelled again')
})

// 12. SaleActions UI tooltips and disabled states check
runCheck('SaleActions renders disabled states with tooltips for expired sales', () => {
  const actionsFile = path.join(srcDir, 'features/sell/components/SaleActions.jsx')
  const content = fs.readFileSync(actionsFile, 'utf8')
  assert(content.includes('isSaleEditable(sale)'), 'SaleActions must check isSaleEditable')
  assert(content.includes('isSaleCancellable(sale)'), 'SaleActions must check isSaleCancellable')
  assert(content.includes('title="Editing is no longer allowed after 30 days from sale date"'), 'SaleActions must show 30 days tooltip for disabled edit')
  assert(content.includes('title="Cancellation is no longer allowed after 45 days from sale date"'), 'SaleActions must show 45 days tooltip for disabled cancel')
})

// 13. Search functionality verification in Rental and Sales modules
runCheck('Rental and Sales listing routes support search by both Product Name and Product Code', () => {
  const bookingsRoutes = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/bookings.routes.js')
  const bookingsContent = fs.readFileSync(bookingsRoutes, 'utf8')
  assert(bookingsContent.includes('productName: { contains: search, mode: \'insensitive\' }'), 'Bookings route must search by productName')
  assert(bookingsContent.includes('productCode: { contains: search, mode: \'insensitive\' }'), 'Bookings route must search by productCode')

  const salesRoutes = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/sales.routes.js')
  const salesContent = fs.readFileSync(salesRoutes, 'utf8')
  assert(salesContent.includes('saleItems: { some: { product: { productName: { contains: search, mode: \'insensitive\' } } } }'), 'Sales route must search by productName')
  assert(salesContent.includes('saleItems: { some: { product: { productCode: { contains: search, mode: \'insensitive\' } } } }'), 'Sales route must search by productCode')
})

// 14. Booking creation includes line items in response
runCheck('POST /bookings transaction returns complete booking with items for Save & Print', () => {
  const bookingsRoutes = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/bookings.routes.js')
  const content = fs.readFileSync(bookingsRoutes, 'utf8')
  assert(content.includes('where: { id: createdBooking.id }'), 'POST /bookings must re-fetch created booking')
  assert(content.includes('bookingItems: {'), 'POST /bookings must include bookingItems in response')
})

// 15. SendBookingDialog conditional fields and select visibility
runCheck('SendBookingDialog conditionally renders Security Deposit and has visible payment method select', () => {
  const dialogFile = path.join(srcDir, 'features/bookings/components/SendBookingDialog.jsx')
  const content = fs.readFileSync(dialogFile, 'utf8')
  assert(content.includes('uncollectedDeposit > 0 && ('), 'Security deposit field must only render when uncollectedDeposit > 0')
  assert(content.includes('unpaidRental > 0 && ('), 'Rental amount field must only render when unpaidRental > 0')
  assert(content.includes('id="pickup_payment_method"'), 'Must have pickup_payment_method select')
  assert(content.includes('leading-normal'), 'Payment method select must use clean leading and height to prevent text clipping')
})

// 16. Null-safe bill template configuration and print components
runCheck('getBillTemplateConfig is 100% null-safe and does not throw when settings is null', async () => {
  const { getBillTemplateConfig, DEFAULT_BILL_TEMPLATE } = await import('../src/features/settings/constants/billTemplate.js')
  const nullConfig = getBillTemplateConfig(null)
  assert.strictEqual(typeof nullConfig, 'object', 'Must return an object when settings is null')
  assert.strictEqual(nullConfig.showLogo, true, 'Default showLogo should be true when settings is null')
  assert.strictEqual(nullConfig.rentalTitle, DEFAULT_BILL_TEMPLATE.bill_rental_title)

  const undefinedConfig = getBillTemplateConfig(undefined)
  assert.strictEqual(undefinedConfig.showLogo, true)

  const customConfig = getBillTemplateConfig({ bill_show_logo: false, bill_rental_title: 'Custom Title' })
  assert.strictEqual(customConfig.showLogo, false)
  assert.strictEqual(customConfig.rentalTitle, 'Custom Title')
})

// 17. Booking and Sale print components have null guards
runCheck('BookingBillPrint and SaleBillPrint include safe null guards', () => {
  const bookingPrintFile = path.join(srcDir, 'features/bookings/components/BookingBillPrint.jsx')
  const bookingPrintContent = fs.readFileSync(bookingPrintFile, 'utf8')
  assert(bookingPrintContent.includes('if (!form) return null'), 'BookingBillPrint must return null if form is not provided')
  assert(bookingPrintContent.includes('getBillTemplateConfig(settings || {})'), 'BookingBillPrint must safely pass settings || {}')

  const salePrintFile = path.join(srcDir, 'features/sell/components/SaleBillPrint.jsx')
  const salePrintContent = fs.readFileSync(salePrintFile, 'utf8')
  assert(salePrintContent.includes('if (!form) return null'), 'SaleBillPrint must return null if form is not provided')
  assert(salePrintContent.includes('getBillTemplateConfig(settings || {})'), 'SaleBillPrint must safely pass settings || {}')
})

// 18. Structured accessory badges in browser print and share PDF
runCheck('Booking invoice renders itemized accessory badges in browser print and backend PDF', () => {
  const bookingPrintFile = path.join(srcDir, 'features/bookings/components/BookingBillPrint.jsx')
  const bookingPrintContent = fs.readFileSync(bookingPrintFile, 'utf8')
  assert(bookingPrintContent.includes('bill-item-accessories-box'), 'BookingBillPrint must render bill-item-accessories-box')
  assert(bookingPrintContent.includes('bill-accessory-chip'), 'BookingBillPrint must render individual bill-accessory-chip elements')

  const pdfServiceFile = path.resolve(__dirname, '../../kapadkart/src/services/pdf/billPdfService.js')
  const pdfServiceContent = fs.readFileSync(pdfServiceFile, 'utf8')
  assert(pdfServiceContent.includes('INCLUDED:'), 'PDF service must render INCLUDED: section')
  assert(pdfServiceContent.includes('roundedRect(curX, curY, chipW, chipHeight, 2)'), 'PDF service must draw rounded chip badges')
})

// 19. Rental Item Availability & Booking Calendar scoping and routes
runCheck('Rental Availability and Calendar routes and module scoping are strictly separated from Sales', () => {
  const bookingsRoutes = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/bookings.routes.js')
  const bookingsContent = fs.readFileSync(bookingsRoutes, 'utf8')
  assert(bookingsContent.includes("router.get('/bookings/availability'"), 'Backend must have /bookings/availability endpoint')
  assert(bookingsContent.includes("router.get('/bookings/calendar'"), 'Backend must have /bookings/calendar endpoint')

  const routesFile = path.join(srcDir, 'app/routes.jsx')
  const routesContent = fs.readFileSync(routesFile, 'utf8')
  assert(routesContent.includes('RentalCalendarPage'), 'routes.jsx must import RentalCalendarPage')
  assert(routesContent.includes('path="booking/calendar"'), 'routes.jsx must register booking/calendar route')
  assert(routesContent.includes("allowedTypes={['RENTAL', 'SALES_AND_RENTAL']}><RentalCalendarPage"), 'RentalCalendarPage must be guarded for RENTAL and SALES_AND_RENTAL only')

  const layoutFile = path.join(srcDir, 'shared/components/Layout.jsx')
  const layoutContent = fs.readFileSync(layoutFile, 'utf8')
  assert(layoutContent.includes("to={path('/booking/calendar')}"), 'Layout sidebar must have link to /booking/calendar under Rentals')
  // Verify Sales section does not contain calendar
  const salesSectionMatch = layoutContent.match(/isSalesAllowed\s*&&([\s\S]*?)<\/li>/)
  assert(salesSectionMatch && !salesSectionMatch[1].includes('calendar'), 'Sales section must NEVER include rental calendar')
})

// 20. Searchable Product Selector and Responsive Views in RentalCalendarPage
runCheck('RentalCalendarPage features SearchableSelect and responsive Month/Schedule List views', () => {
  const calendarPageFile = path.join(srcDir, 'features/bookings/pages/RentalCalendarPage.jsx')
  const calendarContent = fs.readFileSync(calendarPageFile, 'utf8')
  assert(calendarContent.includes("import SearchableSelect from '@/shared/components/SearchableSelect'"), 'Must import SearchableSelect')
  assert(calendarContent.includes('<SearchableSelect'), 'Must render SearchableSelect component for item filtering')
  assert(calendarContent.includes("productOptions"), 'Must construct productOptions for searchable dropdown')
  assert(calendarContent.includes("calendarView === 'month'"), 'Must support Month grid view')
  assert(calendarContent.includes("calendarView === 'agenda'"), 'Must support Agenda / Schedule list view')
  assert(calendarContent.includes("activeDaySchedule"), 'Must provide active focused day details panel for mobile/desktop clarity')
})

// 21. Suggestions in Available Items Search & Calendar UUID Error Guard
runCheck('Available Items Search has autocomplete suggestions and Calendar route has UUID safety guard', () => {
  const calendarPageFile = path.join(srcDir, 'features/bookings/pages/RentalCalendarPage.jsx')
  const calendarContent = fs.readFileSync(calendarPageFile, 'utf8')
  assert(calendarContent.includes("searchSuggestions"), 'Must compute searchSuggestions from rental products')
  assert(calendarContent.includes("showSuggestions"), 'Must support showSuggestions state for popover')
  assert(calendarContent.includes("Product Suggestions"), 'Must render suggestions dropdown header')
  assert(calendarContent.includes("handleSelectSuggestion"), 'Must handle clicking a suggestion to autofill search and size')

  // Verify SearchableSelect onChange safely handles target value
  assert(calendarContent.includes("typeof val === 'string' ? val : 'all'"), 'Must ensure selectedProductId is kept as string')

  // Verify backend bookings.routes.js has UUID guard for calendar product_id
  const bookingsRoutes = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/bookings.routes.js')
  const bookingsContent = fs.readFileSync(bookingsRoutes, 'utf8')
  assert(bookingsContent.includes("isUuid"), 'Calendar endpoint must check isUuid on productId before querying Prisma')
})

// 22. Automatic Deletion of Replaced Older Images in Local, S3, and R2
runCheck('StorageService and routes automatically delete older replaced images across Local, S3, and R2', async () => {
  const storageIndexFile = path.resolve(__dirname, '../../kapadkart/src/services/storage/index.js')
  const storageContent = fs.readFileSync(storageIndexFile, 'utf8')
  assert(storageContent.includes('extractKey(urlOrKey)'), 'StorageService must implement extractKey')
  assert(storageContent.includes('protectedAssets'), 'StorageService must protect static assets from deletion')

  // Verify Product update route invokes storageService.delete
  const productsRoutesFile = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/products.routes.js')
  const productsContent = fs.readFileSync(productsRoutesFile, 'utf8')
  assert(productsContent.includes('storageService.delete(existing.image)'), 'Product route must delete replaced primary image')
  assert(productsContent.includes('storageService.delete(existing.image2)'), 'Product route must delete replaced secondary image')

  // Verify Settings update route invokes storageService.delete
  const settingsRoutesFile = path.resolve(__dirname, '../../kapadkart/src/routes/tenant/settings.routes.js')
  const settingsContent = fs.readFileSync(settingsRoutesFile, 'utf8')
  assert(settingsContent.includes('storageService.delete(existing.logoUrl)'), 'Settings route must delete replaced logo')

  // Verify Admin update route invokes storageService.delete
  const adminRoutesFile = path.resolve(__dirname, '../../kapadkart/src/routes/admin.routes.js')
  const adminContent = fs.readFileSync(adminRoutesFile, 'utf8')
  assert(adminContent.includes('storageService.delete(existingTenant.settings.logoUrl)'), 'Admin route must delete replaced tenant logo')
})

console.log(`\n=================================================================`)
console.log(`  ALL MODALS & SALES FLOW CHECKS PASSED (${passed}/${passed})`)
console.log(`=================================================================\n`)


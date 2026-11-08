import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=================================================================');
console.log('  KAPADKART — ALERT ACCESSIBILITY & CONTRAST VERIFICATION SUITE');
console.log('=================================================================');

// 1. Verify Tailwind CSS v4 custom variant dark mode scoping
const indexCss = fs.readFileSync(path.resolve(rootDir, 'src/shared/styles/index.css'), 'utf8');
assert.ok(
  indexCss.includes('@custom-variant dark (&:where(.dark, .dark *));'),
  'index.css must scope dark mode to .dark class to prevent OS media query leakage'
);
console.log('✔ Tailwind CSS v4 dark variant is safely scoped to .dark class');

// 2. Verify FormErrorAlert uses high-contrast, accessible alert styling
const formErrorAlertCode = fs.readFileSync(
  path.resolve(rootDir, 'src/shared/components/FormErrorAlert.jsx'),
  'utf8'
);
assert.ok(
  formErrorAlertCode.includes('bg-red-50') && formErrorAlertCode.includes('border-red-200'),
  'FormErrorAlert must use solid, clear bg-red-50 and border-red-200'
);
assert.ok(
  formErrorAlertCode.includes('text-red-900'),
  'FormErrorAlert message must use high-contrast text-red-900'
);
assert.ok(
  formErrorAlertCode.includes('text-red-600'),
  'FormErrorAlert icon must use prominent text-red-600'
);
assert.ok(
  !formErrorAlertCode.includes('dark:bg-red-950/30'),
  'FormErrorAlert must not use washed-out 30% alpha dark backgrounds'
);
assert.ok(
  !formErrorAlertCode.includes('dark:text-red-400'),
  'FormErrorAlert must not use low-contrast light pastel text-red-400 on light backgrounds'
);
console.log('✔ FormErrorAlert styling adheres to WCAG high-contrast standards');

// 3. Verify Shop LoginPage uses FormErrorAlert
const shopLoginPage = fs.readFileSync(
  path.resolve(rootDir, 'src/features/auth/pages/LoginPage.jsx'),
  'utf8'
);
assert.ok(
  shopLoginPage.includes('<FormErrorAlert message={error}'),
  'Shop LoginPage must render FormErrorAlert for login failure messages'
);
console.log('✔ Shop LoginPage renders accessible FormErrorAlert');

// 4. Verify Admin LoginPage uses FormErrorAlert
const adminLoginPage = fs.readFileSync(
  path.resolve(rootDir, 'src/features/admin/auth/LoginPage.jsx'),
  'utf8'
);
assert.ok(
  adminLoginPage.includes('<FormErrorAlert message={error}'),
  'Admin LoginPage must render FormErrorAlert for consistent error handling'
);
console.log('✔ Admin LoginPage renders accessible FormErrorAlert');

// 5. Verify AppToaster specifies theme="light"
const appToasterCode = fs.readFileSync(
  path.resolve(rootDir, 'src/shared/components/AppToaster.jsx'),
  'utf8'
);
assert.ok(
  appToasterCode.includes('theme="light"'),
  'AppToaster must enforce theme="light" to prevent OS dark mode conflicts'
);
console.log('✔ AppToaster enforces light theme for crisp toast visibility');

// 6. WCAG 2.1 Contrast Ratio Verification
function sRgbToLin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(r, g, b) {
  return 0.2126 * sRgbToLin(r) + 0.7152 * sRgbToLin(g) + 0.0722 * sRgbToLin(b);
}
function contrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// red-900: #7f1d1d (127, 29, 29) on red-50: #fef2f2 (254, 242, 242)
const lumRed900 = luminance(127, 29, 29);
const lumRed50 = luminance(254, 242, 242);
const alertRatio = contrastRatio(lumRed50, lumRed900);

assert.ok(alertRatio >= 7.0, `Contrast ratio (${alertRatio.toFixed(2)}:1) must meet WCAG AAA (>= 7.0:1)`);
console.log(`✔ WCAG contrast calculation: ${alertRatio.toFixed(2)}:1 (Passes WCAG AAA >= 7.0:1)`);

// 7. Verify Client Dashboard Plan Quotas & Usage Visibility Logic
const { isLimitActive, hasAnyActiveLimit } = await import(
  '../src/features/dashboard/utils/dashboardLimits.js'
);
assert.equal(isLimitActive(null), false, 'null limit must be inactive');
assert.equal(isLimitActive(undefined), false, 'undefined limit must be inactive');
assert.equal(isLimitActive(''), false, 'empty string limit must be inactive');
assert.equal(isLimitActive(0), false, '0 limit must be inactive (unlimited)');
assert.equal(isLimitActive(-10), false, 'negative limit must be inactive');
assert.equal(isLimitActive('unlimited'), false, 'non-numeric string limit must be inactive');
assert.equal(isLimitActive(500), true, 'positive number limit must be active');
assert.equal(isLimitActive('100'), true, 'numeric string limit must be active');

// Test all unlimited scenario (matching screenshot)
assert.equal(
  hasAnyActiveLimit({ maxProducts: null, maxBookings: null, maxSales: null }),
  false,
  'All unlimited limits must evaluate hasAnyActiveLimit to false'
);
assert.equal(
  hasAnyActiveLimit({ maxProducts: '', maxBookings: undefined, maxSales: null }),
  false,
  'Empty/undefined limits must evaluate hasAnyActiveLimit to false'
);

// Test active limits scenario
assert.equal(
  hasAnyActiveLimit({ maxProducts: 50, maxBookings: null, maxSales: null }),
  true,
  'Active product limit must evaluate hasAnyActiveLimit to true'
);
assert.equal(
  hasAnyActiveLimit({ maxProducts: null, maxBookings: 200, maxSales: null, isRentalAllowed: true }),
  true,
  'Active booking limit on rental-enabled store must evaluate hasAnyActiveLimit to true'
);
assert.equal(
  hasAnyActiveLimit({ maxProducts: null, maxBookings: 200, maxSales: null, isRentalAllowed: false }),
  false,
  'Booking limit on sales-only store must not trigger quota section'
);

const dashboardCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/dashboard/pages/DashboardPage.jsx'),
  'utf8'
);
assert.ok(
  dashboardCode.includes('{hasAnyLimit && ('),
  'DashboardPage must conditionally hide Plan quotas & usage when no limits exist'
);
assert.ok(
  dashboardCode.includes('hasAnyActiveLimit'),
  'DashboardPage must compute hasAnyLimit via hasAnyActiveLimit utility'
);
console.log('✔ Client dashboard correctly omits Plan quotas & usage when limits are unconfigured');

// 8. Verify Default Product Placeholder Image configuration
const placeholderPath = path.resolve(rootDir, 'public/product-placeholder.webp');
assert.ok(fs.existsSync(placeholderPath), 'public/product-placeholder.webp asset must exist');
const placeholderStat = fs.statSync(placeholderPath);
assert.ok(placeholderStat.size > 1000, 'product-placeholder.webp must have valid image content');

const apiConfigCode = fs.readFileSync(path.resolve(rootDir, 'src/config/api.js'), 'utf8');
assert.ok(
  apiConfigCode.includes('PRODUCT_PLACEHOLDER_IMAGE') &&
  apiConfigCode.includes('product-placeholder.webp'),
  'src/config/api.js must export PRODUCT_PLACEHOLDER_IMAGE constant'
);

const productCardCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/products/components/ProductCard.jsx'),
  'utf8'
);
assert.ok(
  productCardCode.includes('PRODUCT_PLACEHOLDER_IMAGE'),
  'ProductCard must use PRODUCT_PLACEHOLDER_IMAGE for fallback when image is missing or broken'
);

const productInfoDialogCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/products/components/ProductInfoDialog.jsx'),
  'utf8'
);
assert.ok(
  productInfoDialogCode.includes('PRODUCT_PLACEHOLDER_IMAGE'),
  'ProductInfoDialog must use PRODUCT_PLACEHOLDER_IMAGE for fallback'
);

const productTableCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/products/components/ProductTable.jsx'),
  'utf8'
);
assert.ok(
  productTableCode.includes('PRODUCT_PLACEHOLDER_IMAGE'),
  'ProductTable must use PRODUCT_PLACEHOLDER_IMAGE for fallback'
);

console.log('✔ Default product placeholder image is properly configured and integrated across components');

// 9. Verify 10MB Image Upload Limit & 400KB / 400px Logo Compression
const productImageFieldCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/products/components/ProductImageField.jsx'),
  'utf8'
);
assert.ok(
  productImageFieldCode.includes('10 * 1024 * 1024'),
  'ProductImageField must allow 10MB file uploads'
);
assert.ok(
  productImageFieldCode.includes('10MB or less'),
  'ProductImageField error message must reference 10MB'
);

const adminLogoFieldCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/admin/shops/LogoImageField.jsx'),
  'utf8'
);
assert.ok(
  adminLogoFieldCode.includes('10 * 1024 * 1024'),
  'Admin LogoImageField must allow 10MB file uploads'
);
assert.ok(
  adminLogoFieldCode.includes('maxBytes: 400 * 1024') && adminLogoFieldCode.includes('maxEdge: 400'),
  'Admin LogoImageField must compress logo to 400KB and 400px edge'
);

const settingsLogoFieldCode = fs.readFileSync(
  path.resolve(rootDir, 'src/features/settings/components/LogoImageField.jsx'),
  'utf8'
);
assert.ok(
  settingsLogoFieldCode.includes('10 * 1024 * 1024'),
  'Settings LogoImageField must allow 10MB file uploads'
);
assert.ok(
  settingsLogoFieldCode.includes('maxBytes: 400 * 1024') && settingsLogoFieldCode.includes('maxEdge: 400'),
  'Settings LogoImageField must compress logo to 400KB and 400px edge'
);

const backendConfigCode = fs.readFileSync(
  path.resolve(rootDir, '../kapadkart/src/config/imageConfig.js'),
  'utf8'
);
assert.ok(
  backendConfigCode.includes('IMAGE_BRANDING_MAX_WIDTH) || 400'),
  'Backend imageConfig must constrain branding dimensions to 400px'
);

const backendErrorHandlerCode = fs.readFileSync(
  path.resolve(rootDir, '../kapadkart/src/middleware/errorHandler.js'),
  'utf8'
);
assert.ok(
  backendErrorHandlerCode.includes('maximum limit of 10MB'),
  'Backend errorHandler LIMIT_FILE_SIZE must reference 10MB limit'
);

console.log('✔ All image upload components enforce 10MB limit and 400KB/400px logo compression');

console.log('\n=================================================================');
console.log('  ALL ACCESSIBILITY, CONTRAST, QUOTA & UPLOAD VERIFICATIONS PASSED (9/9)');
console.log('=================================================================\n');


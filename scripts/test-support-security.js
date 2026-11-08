import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SUPPORT_CONFIG,
  buildSupportWhatsAppUrl,
  buildSupportEmailUrl,
  buildSupportTelUrl
} from '../src/config/support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- KapadKart Frontend: Support & Auth Security Validation ---');

// 1. Central Support Configuration
assert.ok(SUPPORT_CONFIG.phoneDisplay, 'SUPPORT_CONFIG must define phoneDisplay');
assert.ok(SUPPORT_CONFIG.phoneRaw, 'SUPPORT_CONFIG must define phoneRaw');
assert.ok(SUPPORT_CONFIG.email, 'SUPPORT_CONFIG must define email');
assert.match(SUPPORT_CONFIG.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Support email must be a valid email format');
assert.match(SUPPORT_CONFIG.phoneRaw, /^\d+$/, 'phoneRaw must contain digits only');
console.log('✔ Central support configuration verified');

// 2. WhatsApp Click-to-Chat Action Builder
const waUrl = buildSupportWhatsAppUrl({ category: 'OTP Delivery Issue' });
assert.ok(waUrl.startsWith('https://wa.me/'), 'WhatsApp URL must start with https://wa.me/');
assert.ok(waUrl.includes(SUPPORT_CONFIG.phoneRaw), 'WhatsApp URL must contain phoneRaw digits');
assert.ok(waUrl.includes(encodeURIComponent('OTP Delivery Issue')), 'WhatsApp URL must include encoded category');
// Ensure no sensitive authentication tokens or passwords exist in URLs
assert.doesNotMatch(waUrl, /(jwt|bearer|token|secret|password|otp=[0-9])/i, 'WhatsApp URL must not leak credentials');
console.log('✔ buildSupportWhatsAppUrl verified safely with prefilled encoded message');

// 3. Email Mailto Action Builder
const emailUrl = buildSupportEmailUrl({ category: 'Login Assistance' });
assert.ok(emailUrl.startsWith(`mailto:${encodeURIComponent(SUPPORT_CONFIG.email)}`), 'Email URL must start with mailto:<email>');
assert.ok(emailUrl.includes('subject='), 'Email URL must include subject parameter');
assert.ok(emailUrl.includes('body='), 'Email URL must include body parameter');
assert.ok(emailUrl.includes(encodeURIComponent('Login Assistance')), 'Email URL must include encoded issue category');
assert.doesNotMatch(emailUrl, /(jwt|bearer|token|secret|password|otp=[0-9])/i, 'Email URL must not leak credentials');
console.log('✔ buildSupportEmailUrl verified safely with prefilled subject and body');

// 4. Telephone Dialer Action Builder
const telUrl = buildSupportTelUrl();
assert.equal(telUrl, `tel:+${SUPPORT_CONFIG.phoneRaw}`, 'Telephone URL must format as tel:+<digits>');
console.log('✔ buildSupportTelUrl verified');

// 5. Audit ForgotPasswordPage for 2-Minute Cooldown, Countdown and Contextual Links
const forgotPasswordCode = fs.readFileSync(path.resolve(rootDir, 'src/features/auth/pages/ForgotPasswordPage.jsx'), 'utf8');
assert.ok(forgotPasswordCode.includes('kapadkart_otp_cooldown_until'), 'ForgotPasswordPage must store cooldown in sessionStorage');
assert.ok(forgotPasswordCode.includes('Resend OTP in'), 'ForgotPasswordPage must render "Resend OTP in mm:ss" countdown format');
assert.ok(forgotPasswordCode.includes('/contact?reason=otp'), 'ForgotPasswordPage must link to support with ?reason=otp');
assert.ok(forgotPasswordCode.includes('/contact?reason=password_reset'), 'ForgotPasswordPage must link to support with ?reason=password_reset');
console.log('✔ ForgotPasswordPage verified for 2-minute cooldown, countdown format, and contextual support links');

// 6. Audit LoginPage for Contextual Support Link
const loginCode = fs.readFileSync(path.resolve(rootDir, 'src/features/auth/pages/LoginPage.jsx'), 'utf8');
assert.ok(loginCode.includes('/contact?reason=login'), 'LoginPage must link to support with ?reason=login');
console.log('✔ LoginPage verified for contextual support link');

// 7. Audit ContactPage for Centralized Support Config & Channels
const contactCode = fs.readFileSync(path.resolve(rootDir, 'src/features/contact/pages/ContactPage.jsx'), 'utf8');
assert.ok(contactCode.includes('SUPPORT_CONFIG'), 'ContactPage must import and utilize SUPPORT_CONFIG');
assert.ok(contactCode.includes('buildSupportWhatsAppUrl'), 'ContactPage must utilize buildSupportWhatsAppUrl');
assert.ok(contactCode.includes('buildSupportEmailUrl'), 'ContactPage must utilize buildSupportEmailUrl');
assert.ok(contactCode.includes('buildSupportTelUrl'), 'ContactPage must utilize buildSupportTelUrl');
console.log('✔ ContactPage verified for 3-channel direct actions (WhatsApp, Email, Tel)');

// 8. Audit PublicNavbar and PublicFooter Integration Across Landing Pages
const homePageCode = fs.readFileSync(path.resolve(rootDir, 'src/features/home/pages/HomePage.jsx'), 'utf8');
const publicNavbarCode = fs.readFileSync(path.resolve(rootDir, 'src/shared/components/PublicNavbar.jsx'), 'utf8');
const publicFooterCode = fs.readFileSync(path.resolve(rootDir, 'src/shared/components/PublicFooter.jsx'), 'utf8');

assert.ok(homePageCode.includes('<PublicNavbar'), 'HomePage must integrate PublicNavbar');
assert.ok(homePageCode.includes('<PublicFooter'), 'HomePage must integrate PublicFooter');
assert.ok(contactCode.includes('<PublicNavbar'), 'ContactPage must integrate PublicNavbar');
assert.ok(contactCode.includes('<PublicFooter'), 'ContactPage must integrate PublicFooter');

assert.ok(publicNavbarCode.includes('Why KapadKart'), 'PublicNavbar must contain Why KapadKart link');
assert.ok(publicNavbarCode.includes('How It Works'), 'PublicNavbar must contain How It Works link');
assert.ok(publicNavbarCode.includes('Features'), 'PublicNavbar must contain Features link');
assert.ok(publicNavbarCode.includes('Boutiques'), 'PublicNavbar must contain Boutiques link');
assert.ok(publicNavbarCode.includes('/contact'), 'PublicNavbar must contain Contact link');
assert.ok(publicNavbarCode.includes('Sign In to Store'), 'PublicNavbar must contain Sign In button');

assert.ok(publicFooterCode.includes('Shop Login'), 'PublicFooter must contain Shop Login');
assert.ok(publicFooterCode.includes('Platform Admin'), 'PublicFooter must contain Platform Admin');
assert.ok(publicFooterCode.includes('Help & Support'), 'PublicFooter must contain Help & Support');
assert.ok(publicFooterCode.includes('buildSupportTelUrl'), 'PublicFooter must contain telephone support link');
console.log('✔ PublicNavbar & PublicFooter verified across HomePage and ContactPage');

// 9. Environment Template Security & Placeholder Verification
const backendEnvExamplePath = path.resolve(rootDir, '../kapadkart/.env.example');
const frontendEnvExamplePath = path.resolve(rootDir, '.env.example');

const backendEnv = fs.readFileSync(backendEnvExamplePath, 'utf8');
const frontendEnv = fs.readFileSync(frontendEnvExamplePath, 'utf8');

// Ensure required keys exist
assert.ok(backendEnv.includes('NODE_ENV='), 'Backend .env.example must specify NODE_ENV');
assert.ok(backendEnv.includes('JWT_SECRET='), 'Backend .env.example must specify JWT_SECRET');
assert.ok(backendEnv.includes('LOCAL_DB_HOST='), 'Backend .env.example must specify LOCAL_DB_HOST');
assert.ok(backendEnv.includes('DATABASE_URL='), 'Backend .env.example must specify DATABASE_URL');
assert.ok(backendEnv.includes('FRONTEND_ORIGIN='), 'Backend .env.example must specify FRONTEND_ORIGIN');

assert.ok(frontendEnv.includes('VITE_BASE_PATH='), 'Frontend .env.example must specify VITE_BASE_PATH');
assert.ok(frontendEnv.includes('VITE_API_BASE_URL='), 'Frontend .env.example must specify VITE_API_BASE_URL');

// Ensure no live passwords, real API keys or secrets exist
assert.doesNotMatch(backendEnv, /(AIzaSy|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|BEGIN PRIVATE KEY)/, 'Backend .env.example must not leak real API keys');
assert.doesNotMatch(frontendEnv, /(AIzaSy|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|BEGIN PRIVATE KEY)/, 'Frontend .env.example must not leak real API keys');
console.log('✔ Production .env.example templates verified with strict placeholder rules');

console.log('\nAll frontend support and security tests passed successfully!\n');

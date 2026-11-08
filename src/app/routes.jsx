import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/features/auth/components/ProtectedRoute'
import { useAuth } from '@/features/auth/context/AuthContext'
import Layout from '@/shared/components/Layout'
import { TenantProvider, useTenant } from '@/shared/tenant/TenantContext'
import { getTenantSlug, tenantPath } from '@/shared/tenant/tenant'

// Admin layout and guard
import AdminLayout from '@/shared/components/AdminLayout'
import AdminProtectedRoute from '@/features/admin/auth/ProtectedRoute'

// Public Landing & Client-facing Pages
const HomePage = lazy(() => import('@/features/home/pages/HomePage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'))
const ProductFormPage = lazy(() => import('@/features/products/pages/ProductFormPage'))
const BookingPage = lazy(() => import('@/features/bookings/pages/BookingPage'))
const BookingFormPage = lazy(() => import('@/features/bookings/pages/BookingFormPage'))
const RentalCalendarPage = lazy(() => import('@/features/bookings/pages/RentalCalendarPage'))
const SalesPage = lazy(() => import('@/features/sell/pages/SalesPage'))
const SaleFormPage = lazy(() => import('@/features/sell/pages/SaleFormPage'))
const SalesReportsPage = lazy(() => import('@/features/sales/pages/SalesReportsPage'))
const ProductSalesReportPage = lazy(() => import('@/features/sell/pages/ProductSalesReportPage'))
const PerformancePage = lazy(() => import('@/features/sales/pages/PerformancePage'))
const ActivityPage = lazy(() => import('@/features/activity/pages/ActivityPage'))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))
const BillingTemplatePage = lazy(() => import('@/features/settings/pages/BillingTemplatePage'))
const BrandsPage = lazy(() => import('@/features/settings/pages/BrandsPage'))
const CategoriesPage = lazy(() => import('@/features/settings/pages/CategoriesPage'))
const AboutPage = lazy(() => import('@/features/about/pages/AboutPage'))
const ContactPage = lazy(() => import('@/features/contact/pages/ContactPage'))

// Platform Admin Pages
const AdminLoginPage = lazy(() => import('@/features/admin/auth/LoginPage'))
const PlatformDashboardPage = lazy(() => import('@/features/admin/dashboard/PlatformDashboardPage'))
const ShopListPage = lazy(() => import('@/features/admin/shops/ShopListPage'))
const ShopFormPage = lazy(() => import('@/features/admin/shops/ShopFormPage'))
const ShopDetailPage = lazy(() => import('@/features/admin/shops/ShopDetailPage'))
const EmailLogsPage = lazy(() => import('@/features/admin/emails/EmailLogsPage'))

function LoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-500/20 border-t-amber-500" />
        <span className="text-xs font-medium text-[#9aa3ad]">Loading…</span>
      </div>
    </div>
  )
}

function HomeRedirect() {
  const { isAuthenticated, loading } = useAuth()
  const slug = getTenantSlug()

  if (loading) {
    return <div className="auth-loading">Loading...</div>
  }

  return (
    <Navigate
      to={isAuthenticated ? tenantPath('/dashboard', slug) : '/login'}
      replace
    />
  )
}

function redirectToTenant(path) {
  return <Navigate to={tenantPath(path, getTenantSlug())} replace />
}

function BusinessRouteGuard({ allowedTypes, children }) {
  const { businessType: tenantType } = useTenant()
  const { user } = useAuth()
  const businessType = user?.tenant?.businessType || user?.tenant?.business_type || tenantType || 'SALES_AND_RENTAL'

  if (allowedTypes && !allowedTypes.includes(businessType)) {
    return <Navigate to="../dashboard" replace />
  }
  return children
}

function ReportsIndexRedirect() {
  const { businessType: tenantType } = useTenant()
  const { user } = useAuth()
  const businessType = user?.tenant?.businessType || user?.tenant?.business_type || tenantType || 'SALES_AND_RENTAL'
  if (businessType === 'SALES') {
    return <Navigate to="sales" replace />
  }
  return <Navigate to="rental" replace />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ============================================================== */}
        {/* PLATFORM ADMIN AREA                                            */}
        {/* ============================================================== */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PlatformDashboardPage />} />
            <Route path="shops" element={<ShopListPage />} />
            <Route path="shops/new" element={<ShopFormPage key="new" />} />
            <Route path="shops/:slug/edit" element={<ShopFormPage key="edit" />} />
            <Route path="shops/:slug" element={<ShopDetailPage />} />
            <Route path="emails" element={<EmailLogsPage />} />
          </Route>
        </Route>

        {/* ============================================================== */}
        {/* CLIENT / TENANT PUBLIC ROUTES                                  */}
        {/* ============================================================== */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
        <Route path="/t" element={<HomeRedirect />} />

        {/* Legacy absolute paths → current/stored tenant */}
        <Route path="/dashboard" element={redirectToTenant('/dashboard')} />
        <Route path="/products/*" element={redirectToTenant('/products')} />
        <Route path="/booking/*" element={redirectToTenant('/booking')} />
        <Route path="/sales/*" element={redirectToTenant('/sales')} />
        <Route path="/sales-reports" element={redirectToTenant('/reports/rental')} />
        <Route path="/reports/*" element={redirectToTenant('/reports/rental')} />
        <Route path="/settings/*" element={redirectToTenant('/settings/company')} />
        <Route path="/about-developers" element={redirectToTenant('/about-developers')} />

        {/* ============================================================== */}
        {/* CLIENT / TENANT PROTECTED ROUTES                               */}
        {/* ============================================================== */}
        <Route path="/t/:tenantSlug" element={<TenantProvider />}>
          <Route path="login" element={<Navigate to="/login" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/add" element={<ProductFormPage key="add" />} />
              <Route path="products/:id/edit" element={<ProductFormPage key="edit" />} />
              <Route path="booking" element={<BusinessRouteGuard allowedTypes={['RENTAL', 'SALES_AND_RENTAL']}><BookingPage /></BusinessRouteGuard>} />
              <Route path="booking/add" element={<BusinessRouteGuard allowedTypes={['RENTAL', 'SALES_AND_RENTAL']}><BookingFormPage key="add" /></BusinessRouteGuard>} />
              <Route path="booking/calendar" element={<BusinessRouteGuard allowedTypes={['RENTAL', 'SALES_AND_RENTAL']}><RentalCalendarPage /></BusinessRouteGuard>} />
              <Route path="booking/:id/edit" element={<BusinessRouteGuard allowedTypes={['RENTAL', 'SALES_AND_RENTAL']}><BookingFormPage key="edit" /></BusinessRouteGuard>} />
              <Route path="sales" element={<BusinessRouteGuard allowedTypes={['SALES', 'SALES_AND_RENTAL']}><SalesPage /></BusinessRouteGuard>} />
              <Route path="sales/add" element={<BusinessRouteGuard allowedTypes={['SALES', 'SALES_AND_RENTAL']}><SaleFormPage key="add" /></BusinessRouteGuard>} />
              <Route path="sales/:id/edit" element={<BusinessRouteGuard allowedTypes={['SALES', 'SALES_AND_RENTAL']}><SaleFormPage key="edit" /></BusinessRouteGuard>} />
              <Route path="reports">
                <Route index element={<ReportsIndexRedirect />} />
                <Route path="rental" element={<BusinessRouteGuard allowedTypes={['RENTAL', 'SALES_AND_RENTAL']}><SalesReportsPage /></BusinessRouteGuard>} />
                <Route path="sales" element={<BusinessRouteGuard allowedTypes={['SALES', 'SALES_AND_RENTAL']}><ProductSalesReportPage /></BusinessRouteGuard>} />
                <Route path="performance" element={<PerformancePage />} />
              </Route>
              <Route path="activity" element={<ActivityPage />} />
              <Route path="sales-reports" element={<Navigate to="../reports/rental" replace />} />
              <Route path="settings">
                <Route index element={<Navigate to="company" replace />} />
                <Route path="company" element={<SettingsPage />} />
                <Route path="billing" element={<BillingTemplatePage />} />
                <Route path="brands" element={<BrandsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
              </Route>
              <Route path="about-developers" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="contact-us" element={<Navigate to="contact" replace />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  )
}

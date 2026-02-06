import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import React, { lazy, Suspense, useEffect } from 'react';
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { lazyWithRetry } from "./shared/utils/lazyWithRetry";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const SupportTickets = lazyWithRetry(() => import("./shared/components/Support/SupportTickets"));
const VendorStore = lazyWithRetry(() => import("./shared/components/Store/VendorStore"));
const ScrollToTop = lazyWithRetry(() => import("./shared/components/ScrollToTop"));
const AdminSupportTickets = lazyWithRetry(() => import("./modules/Admin/pages/supportTickets/SupportTickets"));
const ProtectedRoute = lazyWithRetry(() => import("./shared/components/Auth/ProtectedRoute"));
const ErrorBoundary = lazyWithRetry(() => import("./shared/components/ErrorBoundary/ErrorBoundary"));
const AdminLogin = lazyWithRetry(() => import("./modules/Admin/pages/Login"));
const AdminProtectedRoute = lazyWithRetry(() => import("./modules/Admin/components/AdminProtectedRoute"));
const AdminLayout = lazyWithRetry(() => import("./modules/Admin/components/Layout/AdminLayout"));
const Dashboard = lazyWithRetry(() => import("./modules/Admin/pages/Dashboard"));
const Products = lazyWithRetry(() => import("./modules/Admin/pages/Products"));
const ProductForm = lazyWithRetry(() => import("./modules/Admin/pages/ProductForm"));
const AdminOrders = lazyWithRetry(() => import("./modules/Admin/pages/Orders"));
const OrderDetail = lazyWithRetry(() => import("./modules/Admin/pages/OrderDetail"));
const ReturnRequests = lazyWithRetry(() => import("./modules/Admin/pages/ReturnRequests"));
const ReturnRequestDetail = lazyWithRetry(() => import("./modules/Admin/pages/ReturnRequestDetail"));
const Categories = lazyWithRetry(() => import("./modules/Admin/pages/Categories"));
const Brands = lazyWithRetry(() => import("./modules/Admin/pages/Brands"));
const Inventory = lazyWithRetry(() => import("./modules/Admin/pages/Inventory"));
const Campaigns = lazyWithRetry(() => import("./modules/Admin/pages/Campaigns"));
const AdminHeroBanner = lazyWithRetry(() => import("./modules/Admin/pages/AdminHeroBanner"));
const AdminHeroBannerDetail = lazyWithRetry(() => import("./modules/Admin/pages/AdminHeroBannerDetail"));
const AdminWallet = lazyWithRetry(() => import("./modules/Admin/pages/AdminWallet"));
const Banners = lazyWithRetry(() => import("./modules/Admin/pages/Banners"));
const Reviews = lazyWithRetry(() => import("./modules/Admin/pages/Reviews"));
const Analytics = lazyWithRetry(() => import("./modules/Admin/pages/Analytics"));
const Content = lazyWithRetry(() => import("./modules/Admin/pages/Content"));

// Orders child pages
const AwaitingOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Awaiting"));
const ReceivedOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Received"));
const ProcessedOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Processed"));
const ShippedOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Shipped"));
const DeliveredOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Delivered"));
const CancelledOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Cancelled"));
const ReturnedOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/Returned"));

const Settings = lazyWithRetry(() => import("./modules/Admin/pages/Settings"));
const More = lazyWithRetry(() => import("./modules/Admin/pages/More"));
const PromoCodes = lazyWithRetry(() => import("./modules/Admin/pages/PromoCodes"));
// Orders child pages
const AllOrders = lazyWithRetry(() => import("./modules/Admin/pages/orders/AllOrders"));
const OrderTracking = lazyWithRetry(() => import("./modules/Admin/pages/orders/OrderTracking"));
const OrderNotifications = lazyWithRetry(() => import("./modules/Admin/pages/orders/OrderNotifications"));
const Invoice = lazyWithRetry(() => import("./modules/Admin/pages/orders/Invoice"));
// Products child pages
const ManageProducts = lazyWithRetry(() => import("./modules/Admin/pages/products/ManageProducts"));
const ProductRatings = lazyWithRetry(() => import("./modules/Admin/pages/products/ProductRatings"));
// Categories child pages
const ManageCategories = lazyWithRetry(() => import("./modules/Admin/pages/categories/ManageCategories"));
const CategoryOrder = lazyWithRetry(() => import("./modules/Admin/pages/categories/CategoryOrder"));
// Brands child pages
const ManageBrands = lazyWithRetry(() => import("./modules/Admin/pages/brands/ManageBrands"));
// Offers & Sliders child pages
const FestivalOffers = lazyWithRetry(() => import("./modules/Admin/pages/offers/FestivalOffers"));
// Mega Reward child pages
const MegaRewardEntries = lazyWithRetry(() => import("./modules/Admin/pages/mega-reward/Entries"));
const MegaRewardWinners = lazyWithRetry(() => import("./modules/Admin/pages/mega-reward/Winners"));
const MegaRewardSettings = lazyWithRetry(() => import("./modules/Admin/pages/mega-reward/Settings"));
const MegaRewardPromotionalReels = lazyWithRetry(() => import("./modules/Admin/pages/mega-reward/PromotionalReels"));
// Notifications child pages
const PushNotifications = lazyWithRetry(() => import("./modules/Admin/pages/notifications/PushNotifications"));
const CustomMessages = lazyWithRetry(() => import("./modules/Admin/pages/notifications/CustomMessages"));
// Reports child pages
const SalesReport = lazyWithRetry(() => import("./modules/Admin/pages/reports/SalesReport"));
const InventoryReport = lazyWithRetry(() => import("./modules/Admin/pages/reports/InventoryReport"));
// Analytics & Finance child pages
const RevenueOverview = lazyWithRetry(() => import("./modules/Admin/pages/finance/RevenueOverview"));
const ProfitLoss = lazyWithRetry(() => import("./modules/Admin/pages/finance/ProfitLoss"));
const OrderTrends = lazyWithRetry(() => import("./modules/Admin/pages/finance/OrderTrends"));
const PaymentBreakdown = lazyWithRetry(() => import("./modules/Admin/pages/finance/PaymentBreakdown"));
const TaxReports = lazyWithRetry(() => import("./modules/Admin/pages/finance/TaxReports"));
const RefundReports = lazyWithRetry(() => import("./modules/Admin/pages/finance/RefundReports"));
const WalletRecharges = lazyWithRetry(() => import("./modules/Admin/pages/finance/WalletRecharges"));
// Consolidated Settings pages
const GeneralSettings = lazyWithRetry(() => import("./modules/Admin/pages/settings/GeneralSettings"));
const PaymentShippingSettings = lazyWithRetry(() => import("./modules/Admin/pages/settings/PaymentShippingSettings"));
const OrdersCustomersSettings = lazyWithRetry(() => import("./modules/Admin/pages/settings/OrdersCustomersSettings"));
const ProductsInventorySettings = lazyWithRetry(() => import("./modules/Admin/pages/settings/ProductsInventorySettings"));
const ContentFeaturesSettings = lazyWithRetry(() => import("./modules/Admin/pages/settings/ContentFeaturesSettings"));
const NotificationsSEOSettings = lazyWithRetry(() => import("./modules/Admin/pages/settings/NotificationsSEOSettings"));
// Policies child pages
const PrivacyPolicy = lazyWithRetry(() => import("./modules/Admin/pages/policies/PrivacyPolicy"));
const RefundPolicy = lazyWithRetry(() => import("./modules/Admin/pages/policies/RefundPolicy"));
const TermsConditions = lazyWithRetry(() => import("./modules/Admin/pages/policies/TermsConditions"));
// Firebase child pages
const PushConfig = lazyWithRetry(() => import("./modules/Admin/pages/firebase/PushConfig"));
const Authentication = lazyWithRetry(() => import("./modules/Admin/pages/firebase/Authentication"));
const DeliveryRules = lazyWithRetry(() => import("./modules/Admin/pages/DeliveryRules"));

// Admin B2B Vendor Routes
const AdminB2BVendors = lazyWithRetry(() => import("./modules/Admin/pages/B2BVendors"));
const AdminManageB2BVendors = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/ManageB2BVendors"));
const AdminB2BVendorPendingApprovals = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/PendingApprovals"));
const AdminB2BVendorProductListings = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/ProductListings"));
const AdminB2BVendorAnalyticsPage = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/B2BVendorAnalytics"));
const AdminB2BSubscriptions = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/Subscriptions"));
const B2BBannerManagement = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/B2BBannerManagement"));
const AdminB2BBannerDetail = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/AdminB2BBannerDetail"));
const B2BWallet = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/B2BWallet"));
const AdminB2BCategories = lazyWithRetry(() => import("./modules/Admin/pages/b2b-vendors/Categories"));
const RouteWrapper = lazyWithRetry(() => import("./shared/components/RouteWrapper"));
// Mobile App Routes
const Chat = lazyWithRetry(() => import("./shared/components/Chat/Chat"));

// B2B Vendor Routes
const B2BVendorLogin = lazyWithRetry(() => import("./modules/B2BVendor/pages/Login"));
const B2BVendorRegister = lazyWithRetry(() => import("./modules/B2BVendor/pages/Register.jsx"));
const B2BVendorVerification = lazyWithRetry(() => import("./modules/B2BVendor/pages/Verification"));
const B2BVendorProtectedRoute = lazyWithRetry(() => import("./modules/B2BVendor/components/B2BVendorProtectedRoute"));
const B2BVendorLayout = lazyWithRetry(() => import("./modules/B2BVendor/components/Layout/B2BVendorLayout"));
const B2BVendorDashboard = lazyWithRetry(() => import("./modules/B2BVendor/pages/Dashboard"));
const B2BVendorProducts = lazyWithRetry(() => import("./modules/B2BVendor/pages/Products"));
const B2BVendorManageProducts = lazyWithRetry(() => import("./modules/B2BVendor/pages/products/ManageProducts"));
const B2BVendorAddProduct = lazyWithRetry(() => import("./modules/B2BVendor/pages/products/AddProduct"));
const B2BVendorEditProduct = lazyWithRetry(() => import("./modules/B2BVendor/pages/products/EditProduct"));
const B2BVendorMessages = lazyWithRetry(() => import("./modules/B2BVendor/pages/Messages"));

const B2BVendorSettings = lazyWithRetry(() => import("./modules/B2BVendor/pages/Settings"));
const B2BVendorProfile = lazyWithRetry(() => import("./modules/B2BVendor/pages/Profile"));
const B2BVendorSubscription = lazyWithRetry(() => import("./modules/B2BVendor/pages/Subscription"));
const B2BVendorBannerBooking = lazyWithRetry(() => import("./modules/B2BVendor/pages/B2BBannerBooking"));
const B2BVendorPaymentPage = lazyWithRetry(() => import("./modules/B2BVendor/pages/PaymentPage"));

// B2B User App Routes
const B2BUserLogin = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Login"));
const B2BUserRegister = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Register"));
const B2BUserVerification = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Verification"));

const B2BProductCatalog = lazyWithRetry(() => import("./modules/B2BUserApp/pages/ProductCatalog"));
const B2BInquiries = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Inquiries"));
const B2BUserProfile = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Profile"));
const B2BPersonalProfile = lazyWithRetry(() => import("./modules/B2BUserApp/pages/PersonalProfile"));
const B2BCompanyProfile = lazyWithRetry(() => import("./modules/B2BUserApp/pages/CompanyProfile"));
const B2BNotifications = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Notifications"));

const B2BPayments = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Payments"));
const B2BSupport = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Support"));
const B2BProductDetail = lazyWithRetry(() => import("./modules/B2BUserApp/pages/ProductDetail"));
const B2BVendorStore = lazyWithRetry(() => import("./modules/B2BUserApp/pages/B2BVendorStore"));
const SellerTypeSelection = lazyWithRetry(() => import("./modules/B2BUserApp/pages/SellerTypeSelection"));
const B2BLanding = lazyWithRetry(() => import("./modules/B2BUserApp/pages/B2BLanding"));

// Inner component that has access to useLocation
const AppRoutes = () => {
  // Test System Toast
  useEffect(() => {
    // toast.success("System Connected");
  }, []);

  // Initialize time warp testing cheat


  /*
  useEffect(() => {
    // Only apply toast limiting for non-B2B routes or general toasts
    // This allows multiple important toasts to stack if needed, or prevents aggressive clearing
    const isB2BRoute = window.location.pathname.includes('b2b-vendor');

    if (!isB2BRoute) {
      toasts
        .filter((t) => t.visible) // Only consider visible toasts
        .filter((_, i) => i >= 1) // Limit to 1 toast
        .forEach((t) => toast.dismiss(t.id)); // Dismiss the extra ones
    }
  }, [toasts]);
  */

  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50/50 backdrop-blur-sm fixed inset-0 z-[9999]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white shadow-xl">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900">Loading Experience</span>
            <span className="text-sm text-gray-500">Preparing your marketplace...</span>
          </div>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Navigate to="/b2b/landing" replace />} />
        <Route path="/b2b-vendors" element={<Navigate to="/admin/b2b-vendors" replace />} />
        <Route path="/wholesalers" element={<Navigate to="/admin/b2b-vendors" replace />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="products/manage-products" element={<ManageProducts />} />
          <Route path="products/product-ratings" element={<ProductRatings />} />
          <Route path="more" element={<More />} />
          <Route path="categories" element={<Categories />} />
          <Route
            path="categories/manage-categories"
            element={<ManageCategories />}
          />
          <Route path="categories/category-order" element={<CategoryOrder />} />
          <Route path="brands" element={<Brands />} />
          <Route path="brands/manage-brands" element={<ManageBrands />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/invoice" element={<Invoice />} />
          <Route path="orders/all-orders" element={<AllOrders />} />
          <Route path="orders/awaiting" element={<AwaitingOrders />} />
          <Route path="orders/received" element={<ReceivedOrders />} />
          <Route path="orders/processed" element={<ProcessedOrders />} />
          <Route path="orders/shipped" element={<ShippedOrders />} />
          <Route path="orders/delivered" element={<DeliveredOrders />} />
          <Route path="orders/cancelled" element={<CancelledOrders />} />
          <Route path="orders/returned" element={<ReturnedOrders />} />

          <Route path="orders/order-tracking" element={<OrderTracking />} />
          <Route
            path="orders/order-notifications"
            element={<OrderNotifications />}
          />
          <Route path="return-requests" element={<ReturnRequests />} />
          <Route path="return-requests/:id" element={<ReturnRequestDetail />} />
          <Route path="stock" element={<Inventory />} />
          <Route path="inventory" element={<Inventory />} />

          {/* Admin B2B Vendor Routes */}
          <Route path="b2b-vendors">
            <Route index element={<AdminB2BVendors />} />
            <Route path="manage" element={<AdminManageB2BVendors />} />
            <Route path="pending" element={<AdminB2BVendorPendingApprovals />} />
            <Route path="products" element={<AdminB2BVendorProductListings />} />
            <Route path="banner-bookings" element={<B2BBannerManagement />} />
            <Route path="banner-bookings/details/:id" element={<AdminB2BBannerDetail />} />
            <Route path="wallet" element={<B2BWallet />} />
            <Route path="analytics" element={<AdminB2BVendorAnalyticsPage />} />
            <Route path="subscriptions" element={<AdminB2BSubscriptions />} />
            <Route path="categories" element={<AdminB2BCategories />} />

          </Route>

          <Route path="offers/festival-offers" element={<FestivalOffers />} />
          {/* Mega Reward Routes */}
          <Route path="mega-reward" element={<MegaRewardEntries />} />
          <Route path="mega-reward/entries" element={<MegaRewardEntries />} />
          <Route path="mega-reward/winners" element={<MegaRewardWinners />} />
          <Route path="mega-reward/promotional-reels" element={<MegaRewardPromotionalReels />} />
          <Route path="mega-reward/settings" element={<MegaRewardSettings />} />
          <Route path="promocodes" element={<PromoCodes />} />
          <Route path="notifications" element={<PushNotifications />} />
          <Route
            path="notifications/push-notifications"
            element={<PushNotifications />}
          />
          <Route
            path="notifications/custom-messages"
            element={<CustomMessages />}
          />
          <Route path="reports" element={<SalesReport />} />
          <Route path="reports/sales-report" element={<SalesReport />} />
          <Route path="reports/inventory-report" element={<InventoryReport />} />
          <Route path="finance" element={<RevenueOverview />} />
          <Route path="finance/revenue-overview" element={<RevenueOverview />} />
          <Route path="finance/profit-loss" element={<ProfitLoss />} />
          <Route path="finance/order-trends" element={<OrderTrends />} />
          <Route
            path="finance/payment-breakdown"
            element={<PaymentBreakdown />}
          />
          <Route path="finance/tax-reports" element={<TaxReports />} />
          <Route path="finance/refund-reports" element={<RefundReports />} />
          <Route path="finance/wallet-recharges" element={<WalletRecharges />} />
          <Route path="delivery-rules" element={<DeliveryRules />} />
          <Route path="analytics" element={<Analytics />} />
          <Route
            path="settings"
            element={<Navigate to="/admin/settings/general" replace />}
          />
          <Route path="settings/general" element={<Settings />} />
          <Route path="settings/payment-shipping" element={<Settings />} />
          <Route path="settings/orders-customers" element={<Settings />} />
          <Route path="settings/products-inventory" element={<Settings />} />
          <Route path="settings/content-features" element={<Settings />} />
          <Route path="settings/notifications-seo" element={<Settings />} />
          <Route path="settings/tax" element={<Settings />} />
          <Route path="policies" element={<PrivacyPolicy />} />
          <Route path="policies/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="policies/refund-policy" element={<RefundPolicy />} />
          <Route path="policies/terms-conditions" element={<TermsConditions />} />
          <Route path="firebase" element={<PushConfig />} />
          <Route path="firebase/push-config" element={<PushConfig />} />
          <Route path="firebase/authentication" element={<Authentication />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="hero-banners" element={<AdminHeroBanner />} />
          <Route path="hero-banners/details/:id" element={<AdminHeroBannerDetail />} />
          <Route path="support" element={<Navigate to="/admin/support/tickets" replace />} />
          <Route path="support/tickets" element={<AdminSupportTickets />} />

          <Route path="wallet" element={<AdminWallet />} />
          <Route path="banners" element={<Banners />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="content" element={<Content />} />
        </Route>

        {/* B2B User App Routes */}
        <Route path="/b2b/login" element={<B2BUserLogin />} />
        <Route path="/b2b/register" element={<B2BUserRegister />} />
        <Route path="/b2b/verification" element={<B2BUserVerification />} />

        <Route path="/b2b" element={<Navigate to="/b2b/landing" replace />} />
        <Route path="/b2b/landing" element={<ProtectedRoute><B2BLanding /></ProtectedRoute>} />
        <Route path="/b2b/catalog" element={<ProtectedRoute><B2BProductCatalog /></ProtectedRoute>} />

        <Route path="/b2b/profile" element={<ProtectedRoute><B2BUserProfile /></ProtectedRoute>} />
        <Route path="/b2b/personal-profile" element={<ProtectedRoute><B2BPersonalProfile /></ProtectedRoute>} />
        <Route path="/b2b/seller-selection" element={<ProtectedRoute><SellerTypeSelection /></ProtectedRoute>} />
        <Route path="/b2b/company" element={<ProtectedRoute><B2BCompanyProfile /></ProtectedRoute>} />
        <Route path="/b2b/notifications" element={<ProtectedRoute><B2BNotifications /></ProtectedRoute>} />

        <Route path="/b2b/payments" element={<ProtectedRoute><B2BPayments /></ProtectedRoute>} />
        <Route path="/b2b/support" element={<ProtectedRoute><B2BSupport /></ProtectedRoute>} />
        <Route path="/b2b/product/:id" element={<ProtectedRoute><B2BProductDetail /></ProtectedRoute>} />
        <Route path="/b2b/vendor/:id" element={<ProtectedRoute><B2BVendorStore /></ProtectedRoute>} />

        {/* B2B Vendor Routes */}
        <Route path="/b2b-vendor/login" element={<B2BVendorLogin />} />
        <Route path="/b2b-vendor/register" element={<B2BVendorRegister />} />
        <Route path="/b2b-vendor/payment" element={<B2BVendorPaymentPage />} />
        <Route path="/b2b-vendor/verification" element={<B2BVendorVerification />} />
        <Route
          path="/b2b-vendor"
          element={
            <B2BVendorProtectedRoute>
              <B2BVendorLayout />
            </B2BVendorProtectedRoute>
          }>
          <Route index element={<Navigate to="/b2b-vendor/dashboard" replace />} />
          <Route path="dashboard" element={<B2BVendorDashboard />} />
          <Route path="products" element={<B2BVendorProducts />} />
          <Route path="products/manage-products" element={<B2BVendorManageProducts />} />
          <Route path="products/add-product" element={<B2BVendorAddProduct />} />
          <Route path="products/edit/:id" element={<B2BVendorEditProduct />} />


          <Route path="settings" element={<B2BVendorSettings />} />
          <Route path="settings/profile" element={<B2BVendorSettings />} />
          <Route path="settings/business" element={<Navigate to="/b2b-vendor/settings/profile" replace />} />

          <Route path="subscription" element={<B2BVendorSubscription />} />
          <Route path="banner-booking" element={<B2BVendorBannerBooking />} />
          <Route path="profile" element={<B2BVendorProfile />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to="/b2b/landing" replace />}
        />
      </Routes>
    </Suspense>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}>
          <ScrollToTop />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#121212]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          }>
            <AppRoutes />
          </Suspense>
          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
              zIndex: 99999
            }}
            toastOptions={{
              duration: 3000,
              style: {
                background: "#212121",
                color: "#fff",
                zIndex: 99999,
                fontSize: '14px',
                maxWidth: '90%',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#388E3C",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: "#FF6161",
                  secondary: "#fff",
                },
              },
            }}
          />
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;

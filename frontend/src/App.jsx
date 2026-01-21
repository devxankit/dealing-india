import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import React, { lazy, Suspense } from 'react';
import { Toaster, useToasterStore, toast } from "react-hot-toast";
import { useEffect } from 'react';
import SupportTickets from "./shared/components/Support/SupportTickets";
import VendorStore from "./shared/components/Store/VendorStore";
import AdminSupportTickets from "./modules/Admin/pages/supportTickets/SupportTickets";
import CartDrawer from "./shared/components/Cart/CartDrawer";
import { useTimeWarpCheat } from "./shared/hooks/useTimeWarpCheat";
import ProtectedRoute from "./shared/components/Auth/ProtectedRoute";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";
import AdminLogin from "./modules/Admin/pages/Login";
import AdminProtectedRoute from "./modules/Admin/components/AdminProtectedRoute";
import AdminLayout from "./modules/Admin/components/Layout/AdminLayout";
import Dashboard from "./modules/Admin/pages/Dashboard";
import Products from "./modules/Admin/pages/Products";
import ProductForm from "./modules/Admin/pages/ProductForm";
import AdminOrders from "./modules/Admin/pages/Orders";
import OrderDetail from "./modules/Admin/pages/OrderDetail";
import ReturnRequests from "./modules/Admin/pages/ReturnRequests";
import ReturnRequestDetail from "./modules/Admin/pages/ReturnRequestDetail";
import Categories from "./modules/Admin/pages/Categories";
import Brands from "./modules/Admin/pages/Brands";
import Customers from "./modules/Admin/pages/Customers";
import Inventory from "./modules/Admin/pages/Inventory";
import Campaigns from "./modules/Admin/pages/Campaigns";
import AdminHeroBanner from "./modules/Admin/pages/AdminHeroBanner";
import AdminHeroBannerDetail from "./modules/Admin/pages/AdminHeroBannerDetail";
import AdminWallet from "./modules/Admin/pages/AdminWallet";
import Banners from "./modules/Admin/pages/Banners";
import Reviews from "./modules/Admin/pages/Reviews";
import Analytics from "./modules/Admin/pages/Analytics";
import Content from "./modules/Admin/pages/Content";
import Settings from "./modules/Admin/pages/Settings";
import More from "./modules/Admin/pages/More";
import PromoCodes from "./modules/Admin/pages/PromoCodes";
// Orders child pages
import AllOrders from "./modules/Admin/pages/orders/AllOrders";
import OrderTracking from "./modules/Admin/pages/orders/OrderTracking";
import OrderNotifications from "./modules/Admin/pages/orders/OrderNotifications";
import Invoice from "./modules/Admin/pages/orders/Invoice";
// Products child pages
import ManageProducts from "./modules/Admin/pages/products/ManageProducts";
import ProductRatings from "./modules/Admin/pages/products/ProductRatings";
// Categories child pages
import ManageCategories from "./modules/Admin/pages/categories/ManageCategories";
import CategoryOrder from "./modules/Admin/pages/categories/CategoryOrder";
// Brands child pages
import ManageBrands from "./modules/Admin/pages/brands/ManageBrands";
// Customers child pages
import ViewCustomers from "./modules/Admin/pages/customers/ViewCustomers";
import CustomerAddresses from "./modules/Admin/pages/customers/Addresses";
import Transactions from "./modules/Admin/pages/customers/Transactions";
import CustomerDetailPage from "./modules/Admin/pages/customers/CustomerDetailPage";
import CustomerAnalytics from "./modules/Admin/pages/customers/CustomerAnalytics";
// Vendors child pages
import Vendors from "./modules/Admin/pages/Vendors";
import ManageVendors from "./modules/Admin/pages/vendors/ManageVendors";
import PendingApprovals from "./modules/Admin/pages/vendors/PendingApprovals";
import VendorDetail from "./modules/Admin/pages/vendors/VendorDetail";
import CommissionRates from "./modules/Admin/pages/vendors/CommissionRates";
import AdminVendorAnalytics from "./modules/Admin/pages/vendors/VendorAnalytics";
import VendorWalletManagement from "./modules/Admin/pages/vendors/VendorWalletManagement";
import Subscriptions from "./modules/Admin/pages/vendors/Subscriptions";
// Offers & Sliders child pages
import FestivalOffers from "./modules/Admin/pages/offers/FestivalOffers";
// Mega Reward child pages
import MegaRewardEntries from "./modules/Admin/pages/mega-reward/Entries";
import MegaRewardWinners from "./modules/Admin/pages/mega-reward/Winners";
import MegaRewardSettings from "./modules/Admin/pages/mega-reward/Settings";
import MegaRewardPromotionalReels from "./modules/Admin/pages/mega-reward/PromotionalReels";
// Notifications child pages
import PushNotifications from "./modules/Admin/pages/notifications/PushNotifications";
import CustomMessages from "./modules/Admin/pages/notifications/CustomMessages";
// Reports child pages
import SalesReport from "./modules/Admin/pages/reports/SalesReport";
import InventoryReport from "./modules/Admin/pages/reports/InventoryReport";
// Analytics & Finance child pages
import RevenueOverview from "./modules/Admin/pages/finance/RevenueOverview";
import ProfitLoss from "./modules/Admin/pages/finance/ProfitLoss";
import OrderTrends from "./modules/Admin/pages/finance/OrderTrends";
import PaymentBreakdown from "./modules/Admin/pages/finance/PaymentBreakdown";
import TaxReports from "./modules/Admin/pages/finance/TaxReports";
import RefundReports from "./modules/Admin/pages/finance/RefundReports";
import WalletRecharges from "./modules/Admin/pages/finance/WalletRecharges";
// Consolidated Settings pages
import GeneralSettings from "./modules/Admin/pages/settings/GeneralSettings";
import PaymentShippingSettings from "./modules/Admin/pages/settings/PaymentShippingSettings";
import OrdersCustomersSettings from "./modules/Admin/pages/settings/OrdersCustomersSettings";
import ProductsInventorySettings from "./modules/Admin/pages/settings/ProductsInventorySettings";
import ContentFeaturesSettings from "./modules/Admin/pages/settings/ContentFeaturesSettings";
import NotificationsSEOSettings from "./modules/Admin/pages/settings/NotificationsSEOSettings";
// Policies child pages
import PrivacyPolicy from "./modules/Admin/pages/policies/PrivacyPolicy";
import RefundPolicy from "./modules/Admin/pages/policies/RefundPolicy";
import TermsConditions from "./modules/Admin/pages/policies/TermsConditions";
// Firebase child pages
import PushConfig from "./modules/Admin/pages/firebase/PushConfig";
import Authentication from "./modules/Admin/pages/firebase/Authentication";
import DeliveryRules from "./modules/Admin/pages/DeliveryRules";

// Admin B2B Vendor Routes
import AdminB2BVendors from "./modules/Admin/pages/B2BVendors";
import AdminManageB2BVendors from "./modules/Admin/pages/b2b-vendors/ManageB2BVendors";
import AdminB2BVendorPendingApprovals from "./modules/Admin/pages/b2b-vendors/PendingApprovals";
import AdminB2BVendorProductListings from "./modules/Admin/pages/b2b-vendors/ProductListings";
import AdminB2BVendorAnalyticsPage from "./modules/Admin/pages/b2b-vendors/B2BVendorAnalytics";
import AdminB2BSubscriptions from "./modules/Admin/pages/b2b-vendors/Subscriptions";
import B2BBannerManagement from "./modules/Admin/pages/b2b-vendors/B2BBannerManagement";
import AdminB2BBannerDetail from "./modules/Admin/pages/b2b-vendors/AdminB2BBannerDetail";
import B2BWallet from "./modules/Admin/pages/b2b-vendors/B2BWallet";
import AdminB2BCategories from "./modules/Admin/pages/b2b-vendors/Categories";
import RouteWrapper from "./shared/components/RouteWrapper";
// Mobile App Routes
import { lazyWithRetry } from "./shared/utils/lazyWithRetry";
const Chat = lazyWithRetry(() => import("./shared/components/Chat/Chat"));
import ScrollToTop from "./shared/components/ScrollToTop";

// Mobile App Routes (Eager Loaded for Instant Nav)
import MobileHome from "./modules/UserApp/pages/Home";
import MobileCategories from "./modules/UserApp/pages/categories";
import MobileSearch from "./modules/UserApp/pages/Search";
import MobileReels from "./modules/UserApp/pages/Reels";
import MobileProfile from "./modules/UserApp/pages/Profile";
import MobileLogin from "./modules/UserApp/pages/Login";

// Mobile App Routes (Lazy Loaded with Auto-Refresh on Fail)
const MobileProductDetail = lazyWithRetry(() => import("./modules/UserApp/pages/ProductDetail"));
const MobileCategory = lazyWithRetry(() => import("./modules/UserApp/pages/Category"));
const MobileCheckout = lazyWithRetry(() => import("./modules/UserApp/pages/Checkout"));
const MobileRegister = lazyWithRetry(() => import("./modules/UserApp/pages/Register"));
const MobileVerification = lazyWithRetry(() => import("./modules/UserApp/pages/Verification"));
const MobileOrders = lazyWithRetry(() => import("./modules/UserApp/pages/Orders"));
const MobileOrderDetail = lazyWithRetry(() => import("./modules/UserApp/pages/OrderDetail"));
const MobileAddresses = lazyWithRetry(() => import("./modules/UserApp/pages/Addresses"));
const MobileNotifications = lazyWithRetry(() => import("./modules/UserApp/pages/Notifications"));
const MobileWishlist = lazyWithRetry(() => import("./modules/UserApp/pages/Wishlist"));
const MobileOffers = lazyWithRetry(() => import("./modules/UserApp/pages/Offers"));
const MobileDailyDeals = lazyWithRetry(() => import("./modules/UserApp/pages/DailyDeals"));
const MobileFlashSale = lazyWithRetry(() => import("./modules/UserApp/pages/FlashSale"));
const MobileTrackOrder = lazyWithRetry(() => import("./modules/UserApp/pages/TrackOrder"));
const MobileOrderConfirmation = lazyWithRetry(() => import("./modules/UserApp/pages/OrderConfirmation"));
const MobileMegaReward = lazyWithRetry(() => import("./modules/UserApp/pages/MegaReward"));
const MobileSettings = lazyWithRetry(() => import("./modules/UserApp/pages/Settings"));
const MobileChangePassword = lazyWithRetry(() => import("./modules/UserApp/pages/ChangePassword"));
const MobileContentPage = lazyWithRetry(() => import("./modules/UserApp/pages/ContentPage"));
const MobileWallet = lazyWithRetry(() => import("./modules/UserApp/pages/Wallet"));
const MobileReturnRequest = lazyWithRetry(() => import("./modules/UserApp/pages/ReturnRequest"));
const MobileMyReturns = lazyWithRetry(() => import("./modules/UserApp/pages/MyReturns"));
const MobileForgotPassword = lazyWithRetry(() => import("./modules/UserApp/pages/ForgotPassword"));
const MobileSingleReel = lazyWithRetry(() => import("./modules/UserApp/pages/SingleReel"));

// Vendor Routes
import VendorLogin from "./modules/Vendor/pages/Login";
import VendorRegister from "./modules/Vendor/pages/Register";
import VendorVerification from "./modules/Vendor/pages/Verification";
import VendorForgotPassword from "./modules/Vendor/pages/ForgotPassword";
import VendorProtectedRoute from "./modules/Vendor/components/VendorProtectedRoute";
import VendorLayout from "./modules/Vendor/components/Layout/VendorLayout";
import VendorReels from "./modules/Vendor/pages/Reels";
import VendorDashboard from "./modules/Vendor/pages/Dashboard";
import VendorProducts from "./modules/Vendor/pages/Products";
import VendorManageProducts from "./modules/Vendor/pages/products/ManageProducts";
import VendorAddProduct from "./modules/Vendor/pages/products/AddProduct";
import VendorProductForm from "./modules/Vendor/pages/products/ProductForm";
import VendorOrders from "./modules/Vendor/pages/Orders";
import VendorAllOrders from "./modules/Vendor/pages/orders/AllOrders";
import VendorOrderTracking from "./modules/Vendor/pages/orders/OrderTracking";
import VendorOrderDetail from "./modules/Vendor/pages/orders/OrderDetail";
import VendorInvoice from "./modules/Vendor/pages/orders/Invoice";
import VendorAnalytics from "./modules/Vendor/pages/Analytics";
import VendorEarnings from "./modules/Vendor/pages/Earnings";
import VendorSettings from "./modules/Vendor/pages/Settings";
import VendorSubscription from "./modules/Vendor/pages/Subscription";
import VendorSupportTickets from "./modules/Vendor/pages/SupportTickets";
import VendorHeroBannerBooking from "./modules/Vendor/pages/HeroBannerBooking";
import VendorHeroBannerBookingDetail from "./modules/Vendor/pages/HeroBannerBookingDetail";
import VendorStockManagement from "./modules/Vendor/pages/StockManagement";

import VendorPickupLocations from "./modules/Vendor/pages/PickupLocations";
import VendorReturnRequests from "./modules/Vendor/pages/ReturnRequests";
import VendorReturnRequestDetail from "./modules/Vendor/pages/returns/ReturnRequestDetail";
import VendorProductReviews from "./modules/Vendor/pages/ProductReviews";
import VendorPromotions from "./modules/Vendor/pages/Promotions";
import VendorNotifications from "./modules/Vendor/pages/Notifications";
import VendorChat from "./modules/Vendor/pages/Chat";
import VendorAllReels from "./modules/Vendor/pages/reels/AllReels";
import VendorAddReel from "./modules/Vendor/pages/reels/AddReel";
import VendorEditReel from "./modules/Vendor/pages/reels/EditReel";
import VendorProductFAQs from "./modules/Vendor/pages/ProductFAQs";
import VendorShippingManagement from "./modules/Vendor/pages/ShippingManagement";
import VendorCustomers from "./modules/Vendor/pages/Customers";
import VendorCustomerDetail from "./modules/Vendor/pages/CustomerDetail";
import VendorProductAttributes from "./modules/Vendor/pages/ProductAttributes";
import VendorAttributes from "./modules/Vendor/pages/attributes/Attributes";
import VendorAttributeValues from "./modules/Vendor/pages/attributes/AttributeValues";
import VendorAttributeSets from "./modules/Vendor/pages/attributes/AttributeSets";
import VendorInventoryReports from "./modules/Vendor/pages/InventoryReports";
import VendorPerformanceMetrics from "./modules/Vendor/pages/PerformanceMetrics";

// B2B Vendor Routes
import B2BVendorLogin from "./modules/B2BVendor/pages/Login";
import B2BVendorRegister from "./modules/B2BVendor/pages/Register.jsx";
import B2BVendorVerification from "./modules/B2BVendor/pages/Verification";
import B2BVendorProtectedRoute from "./modules/B2BVendor/components/B2BVendorProtectedRoute";
import B2BVendorLayout from "./modules/B2BVendor/components/Layout/B2BVendorLayout";
import B2BVendorDashboard from "./modules/B2BVendor/pages/Dashboard";
import B2BVendorProducts from "./modules/B2BVendor/pages/Products";
import B2BVendorManageProducts from "./modules/B2BVendor/pages/products/ManageProducts";
import B2BVendorAddProduct from "./modules/B2BVendor/pages/products/AddProduct";
import B2BVendorEditProduct from "./modules/B2BVendor/pages/products/EditProduct";
import B2BVendorMessages from "./modules/B2BVendor/pages/Messages";
import B2BVendorAnalytics from "./modules/B2BVendor/pages/Analytics";
import B2BVendorSettings from "./modules/B2BVendor/pages/Settings";
import B2BVendorProfile from "./modules/B2BVendor/pages/Profile";
import B2BVendorSubscription from "./modules/B2BVendor/pages/Subscription";
import B2BVendorBannerBooking from "./modules/B2BVendor/pages/B2BBannerBooking";
import B2BVendorPaymentPage from "./modules/B2BVendor/pages/PaymentPage";

// B2B User App Routes
import B2BUserLogin from "./modules/B2BUserApp/pages/Login";
import B2BUserRegister from "./modules/B2BUserApp/pages/Register";
import B2BUserVerification from "./modules/B2BUserApp/pages/Verification";
import B2BUserDashboard from "./modules/B2BUserApp/pages/Dashboard";
import B2BProductCatalog from "./modules/B2BUserApp/pages/ProductCatalog";
import B2BInquiries from "./modules/B2BUserApp/pages/Inquiries";
import B2BUserProfile from "./modules/B2BUserApp/pages/Profile";
import B2BCompanyProfile from "./modules/B2BUserApp/pages/CompanyProfile";
import B2BNotifications from "./modules/B2BUserApp/pages/Notifications";

import B2BPayments from "./modules/B2BUserApp/pages/Payments";
import B2BSupport from "./modules/B2BUserApp/pages/Support";
import B2BProductDetail from "./modules/B2BUserApp/pages/ProductDetail";
import B2BVendorStore from "./modules/B2BUserApp/pages/B2BVendorStore";
import SellerTypeSelection from "./modules/B2BUserApp/pages/SellerTypeSelection";

// Inner component that has access to useLocation
const AppRoutes = () => {
  const { toasts } = useToasterStore();

  // Initialize time warp testing cheat
  useTimeWarpCheat();

  useEffect(() => {
    toasts
      .filter((t) => t.visible) // Only consider visible toasts
      .filter((_, i) => i >= 1) // Limit to 1 toast
      .forEach((t) => toast.dismiss(t.id)); // Dismiss the extra ones
  }, [toasts]);

  return (
    <>
      <Routes>
        {/* Redirect old UserWeb routes to UserApp */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/product/:id" element={<Navigate to="/app/product/:id" replace />} />
        <Route path="/category/:id" element={<Navigate to="/app/category/:id" replace />} />
        <Route path="/vendor/:id" element={<Navigate to="/app/vendor/:id" replace />} />
        <Route path="/checkout" element={<Navigate to="/app/checkout" replace />} />
        <Route path="/search" element={<Navigate to="/app/search" replace />} />
        <Route path="/login" element={<Navigate to="/app/login" replace />} />
        <Route path="/register" element={<Navigate to="/app/register" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/app/forgot-password" replace />} />
        <Route path="/verification" element={<Navigate to="/app/verification" replace />} />
        <Route path="/wishlist" element={<Navigate to="/app/wishlist" replace />} />
        <Route path="/offers" element={<Navigate to="/app/offers" replace />} />
        <Route path="/daily-deals" element={<Navigate to="/app/daily-deals" replace />} />
        <Route path="/flash-sale" element={<Navigate to="/app/flash-sale" replace />} />
        <Route path="/order-confirmation/:orderId" element={<Navigate to="/app/order-confirmation/:orderId" replace />} />
        <Route path="/orders/:orderId" element={<Navigate to="/app/orders/:orderId" replace />} />
        <Route path="/track-order/:orderId" element={<Navigate to="/app/track-order/:orderId" replace />} />
        <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
        <Route path="/orders" element={<Navigate to="/app/orders" replace />} />
        <Route path="/addresses" element={<Navigate to="/app/addresses" replace />} />
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
          <Route path="orders/order-tracking" element={<OrderTracking />} />
          <Route
            path="orders/order-notifications"
            element={<OrderNotifications />}
          />
          <Route path="return-requests" element={<ReturnRequests />} />
          <Route path="return-requests/:id" element={<ReturnRequestDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/view-customers" element={<ViewCustomers />} />
          <Route path="customers/addresses" element={<CustomerAddresses />} />
          <Route path="customers/transactions" element={<Transactions />} />
          <Route path="customers/analytics" element={<CustomerAnalytics />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="stock" element={<Inventory />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/manage-vendors" element={<ManageVendors />} />
          <Route
            path="vendors/pending-approvals"
            element={<PendingApprovals />}
          />
          <Route path="vendors/commission-rates" element={<CommissionRates />} />
          <Route
            path="vendors/vendor-analytics"
            element={<AdminVendorAnalytics />}
          />
          <Route
            path="vendors/vendor-wallet"
            element={<VendorWalletManagement />}
          />
          <Route
            path="subscriptions"
            element={<Subscriptions />}
          />
          <Route path="vendors/:id" element={<VendorDetail />} />

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
            <Route path=":id" element={<VendorDetail />} />
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

        <Route path="/b2b" element={<ProtectedRoute><B2BUserDashboard /></ProtectedRoute>} />
        <Route path="/b2b/catalog" element={<ProtectedRoute><B2BProductCatalog /></ProtectedRoute>} />
        <Route path="/b2b/inquiries" element={<ProtectedRoute><B2BInquiries /></ProtectedRoute>} />
        <Route path="/b2b/profile" element={<ProtectedRoute><B2BUserProfile /></ProtectedRoute>} />
        <Route path="/b2b/seller-selection" element={<ProtectedRoute><SellerTypeSelection /></ProtectedRoute>} />
        <Route path="/b2b/company" element={<ProtectedRoute><B2BCompanyProfile /></ProtectedRoute>} />
        <Route path="/b2b/notifications" element={<ProtectedRoute><B2BNotifications /></ProtectedRoute>} />

        <Route path="/b2b/payments" element={<ProtectedRoute><B2BPayments /></ProtectedRoute>} />
        <Route path="/b2b/support" element={<ProtectedRoute><B2BSupport /></ProtectedRoute>} />
        <Route path="/b2b/product/:id" element={<ProtectedRoute><B2BProductDetail /></ProtectedRoute>} />
        <Route path="/b2b/vendor/:id" element={<ProtectedRoute><B2BVendorStore /></ProtectedRoute>} />

        {/* Vendor Routes */}
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/register" element={<VendorRegister />} />
        <Route path="/vendor/verification" element={<VendorVerification />} />
        <Route path="/vendor/forgot-password" element={<VendorForgotPassword />} />
        <Route
          path="/vendor"
          element={
            <VendorProtectedRoute>
              <VendorLayout />
            </VendorProtectedRoute>
          }>
          <Route index element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="products" element={<VendorProducts />} />
          <Route
            path="products/manage-products"
            element={<VendorManageProducts />}
          />
          <Route path="products/add-product" element={<VendorAddProduct />} />
          <Route path="products/product-faqs" element={<VendorProductFAQs />} />
          <Route
            path="products/product-attributes"
            element={<VendorProductAttributes />}
          />
          <Route path="attributes" element={<VendorAttributeSets />} />
          <Route path="attributes/attribute-sets" element={<VendorAttributeSets />} />
          <Route path="attributes/attributes" element={<VendorAttributes />} />
          <Route
            path="attributes/attribute-values"
            element={<VendorAttributeValues />}
          />
          <Route path="products/:id" element={<VendorProductForm />} />
          <Route path="orders" element={<VendorOrders />} />
          <Route path="orders/all-orders" element={<VendorAllOrders />} />
          <Route path="orders/hold-order" element={<VendorAllOrders />} />
          <Route path="orders/pending-order" element={<VendorAllOrders />} />
          <Route path="orders/ready-to-ship" element={<VendorAllOrders />} />
          <Route path="orders/dispatch-order" element={<VendorAllOrders />} />
          <Route path="orders/shipped-seller" element={<VendorAllOrders />} />
          <Route path="orders/canceled-order" element={<VendorAllOrders />} />
          <Route path="orders/order-tracking" element={<VendorOrderTracking />} />
          <Route path="orders/:id" element={<VendorOrderDetail />} />
          <Route path="orders/:id/invoice" element={<VendorInvoice />} />
          <Route path="chat" element={<VendorChat />} />
          <Route path="chat/:userId" element={<VendorChat />} />
          <Route path="support-tickets" element={<VendorSupportTickets />} />
          <Route path="reels" element={<VendorReels />} />
          <Route path="reels/all-reels" element={<VendorAllReels />} />
          <Route path="reels/add-reel" element={<VendorAddReel />} />
          <Route path="reels/edit-reel/:id" element={<VendorEditReel />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="earnings" element={<VendorEarnings />} />
          <Route path="earnings/overview" element={<VendorEarnings />} />
          <Route path="earnings/wallet" element={<VendorEarnings />} />
          <Route
            path="earnings/commission-history"
            element={<VendorEarnings />}
          />
          <Route
            path="earnings/settlement-history"
            element={<VendorEarnings />}
          />
          <Route
            path="earnings/advertisement-payment"
            element={<VendorEarnings />}
          />
          <Route path="stock-management" element={<VendorStockManagement />} />
          <Route path="stock-management/all" element={<VendorStockManagement />} />
          <Route path="stock-management/in-stock" element={<VendorStockManagement />} />
          <Route path="stock-management/low-stock" element={<VendorStockManagement />} />
          <Route path="stock-management/out-of-stock" element={<VendorStockManagement />} />

          <Route path="pickup-locations" element={<VendorPickupLocations />} />
          <Route path="return-requests" element={<VendorReturnRequests />} />
          <Route
            path="return-requests/:id"
            element={<VendorReturnRequestDetail />}
          />
          <Route path="product-reviews" element={<VendorProductReviews />} />
          <Route path="promotions" element={<VendorPromotions />} />
          <Route path="hero-banner-booking" element={<VendorHeroBannerBooking />} />
          <Route path="hero-banner-booking/details/:id" element={<VendorHeroBannerBookingDetail />} />
          <Route path="notifications" element={<VendorNotifications />} />
          <Route
            path="shipping-management"
            element={<VendorShippingManagement />}
          />
          <Route path="customers/:id" element={<VendorCustomerDetail />} />
          <Route path="customers" element={<VendorCustomers />} />
          <Route path="inventory-reports" element={<VendorInventoryReports />} />
          <Route
            path="performance-metrics"
            element={<VendorPerformanceMetrics />}
          />
          <Route path="settings" element={<VendorSettings />} />
          <Route path="subscription" element={<VendorSubscription />} />
          <Route path="settings/store" element={<VendorSettings />} />
          <Route path="settings/payment" element={<VendorSettings />} />
          <Route path="settings/payment-settings" element={<VendorSettings />} />
          <Route path="settings/shipping" element={<VendorSettings />} />
          <Route path="settings/shipping-settings" element={<VendorSettings />} />
          <Route path="profile" element={<VendorSettings />} />

          <Route path="profile" element={<VendorSettings />} />
        </Route>
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
          <Route path="messages" element={<B2BVendorMessages />} />
          <Route path="analytics" element={<B2BVendorAnalytics />} />
          <Route path="settings" element={<B2BVendorSettings />} />
          <Route path="settings/profile" element={<B2BVendorSettings />} />
          <Route path="settings/business" element={<Navigate to="/b2b-vendor/settings/profile" replace />} />

          <Route path="subscription" element={<B2BVendorSubscription />} />
          <Route path="banner-booking" element={<B2BVendorBannerBooking />} />
          <Route path="profile" element={<B2BVendorProfile />} />
        </Route>
        {/* Mobile App Routes */}
        <Route
          path="/app/chat"
          element={
            <RouteWrapper>
              <Chat />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/chat/:vendorId"
          element={
            <RouteWrapper>
              <Chat />
            </RouteWrapper>
          }
        />
        <Route
          path="/app"
          element={
            <RouteWrapper>
              <MobileHome />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/product/:id"
          element={
            <RouteWrapper>
              <MobileProductDetail />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/category/:id"
          element={
            <RouteWrapper>
              <MobileCategory />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/categories"
          element={
            <RouteWrapper>
              <MobileCategories />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/vendor/:id"
          element={
            <RouteWrapper>
              <VendorStore />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/checkout"
          element={
            <RouteWrapper>
              <MobileCheckout />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/search"
          element={
            <RouteWrapper>
              <MobileSearch />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/reels"
          element={
            <RouteWrapper>
              <MobileReels />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/reels/:id"
          element={
            <RouteWrapper>
              <MobileSingleReel />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/login"
          element={
            <RouteWrapper>
              <MobileLogin />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/register"
          element={
            <RouteWrapper>
              <MobileRegister />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/forgot-password"
          element={
            <RouteWrapper>
              <MobileForgotPassword />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/verification"
          element={
            <RouteWrapper>
              <MobileVerification />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/wishlist"
          element={
            <RouteWrapper>
              <MobileWishlist />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/offers"
          element={
            <RouteWrapper>
              <MobileOffers />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/daily-deals"
          element={
            <RouteWrapper>
              <MobileDailyDeals />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/flash-sale"
          element={
            <RouteWrapper>
              <MobileFlashSale />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/order-confirmation/:orderId"
          element={
            <RouteWrapper>
              <MobileOrderConfirmation />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/orders/:orderId"
          element={
            <RouteWrapper>
              <MobileOrderDetail />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/track-order/:orderId"
          element={
            <RouteWrapper>
              <MobileTrackOrder />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/profile"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileProfile />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/support-tickets"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <SupportTickets />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/returns"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileMyReturns />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/orders"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileOrders />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/addresses"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileAddresses />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/return-request/:orderId"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileReturnRequest />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/notifications"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileNotifications />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/mega-reward"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileMegaReward />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/settings"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileSettings />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/change-password"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileChangePassword />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/app/terms"
          element={
            <RouteWrapper>
              <MobileContentPage title="Terms of Service" type="terms" />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/privacy"
          element={
            <RouteWrapper>
              <MobileContentPage title="Privacy Policy" type="privacy" />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/about"
          element={
            <RouteWrapper>
              <MobileContentPage title="About Us" type="about" />
            </RouteWrapper>
          }
        />
        <Route
          path="/app/wallet"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileWallet />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/app" replace />}
        />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
        <ScrollToTop />
        <AppRoutes />
        <CartDrawer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#212121",
              color: "#fff",
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
  );
}

export default App;

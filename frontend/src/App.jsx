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
const AdminSupportTickets = lazyWithRetry(() => import("./modules/Admin/pages/supportTickets/SupportTickets"));
const CartDrawer = lazyWithRetry(() => import("./shared/components/Cart/CartDrawer"));
import { useTimeWarpCheat } from "./shared/hooks/useTimeWarpCheat";
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
const Customers = lazyWithRetry(() => import("./modules/Admin/pages/Customers"));
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
// Customers child pages
const ViewCustomers = lazyWithRetry(() => import("./modules/Admin/pages/customers/ViewCustomers"));
const CustomerAddresses = lazyWithRetry(() => import("./modules/Admin/pages/customers/Addresses"));
const Transactions = lazyWithRetry(() => import("./modules/Admin/pages/customers/Transactions"));
const CustomerDetailPage = lazyWithRetry(() => import("./modules/Admin/pages/customers/CustomerDetailPage"));
const CustomerAnalytics = lazyWithRetry(() => import("./modules/Admin/pages/customers/CustomerAnalytics"));
// Vendors child pages
const Vendors = lazyWithRetry(() => import("./modules/Admin/pages/Vendors"));
const ManageVendors = lazyWithRetry(() => import("./modules/Admin/pages/vendors/ManageVendors"));
const PendingApprovals = lazyWithRetry(() => import("./modules/Admin/pages/vendors/PendingApprovals"));
const VendorDetail = lazyWithRetry(() => import("./modules/Admin/pages/vendors/VendorDetail"));
const CommissionRates = lazyWithRetry(() => import("./modules/Admin/pages/vendors/CommissionRates"));
const AdminVendorAnalytics = lazyWithRetry(() => import("./modules/Admin/pages/vendors/VendorAnalytics"));
const VendorWalletManagement = lazyWithRetry(() => import("./modules/Admin/pages/vendors/VendorWalletManagement"));
const Subscriptions = lazyWithRetry(() => import("./modules/Admin/pages/vendors/Subscriptions"));
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
const ScrollToTop = lazyWithRetry(() => import("./shared/components/ScrollToTop"));

// Mobile App Routes (Eager Loaded for Instant Nav)
import LandingPage from "./modules/UserApp/pages/LandingPage";
import MobileHome from "./modules/UserApp/pages/Home";
import MobileCategories from "./modules/UserApp/pages/categories";
import MobileSearch from "./modules/UserApp/pages/Search";
import MobileReels from "./modules/UserApp/pages/Reels";
const MobileProfile = lazyWithRetry(() => import("./modules/UserApp/pages/Profile"));
const MobileBecomeSeller = lazyWithRetry(() => import("./modules/UserApp/pages/BecomeSeller"));
const MobileLogin = lazyWithRetry(() => import("./modules/UserApp/pages/Login"));

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
const VendorLogin = lazyWithRetry(() => import("./modules/Vendor/pages/Login"));
const VendorRegister = lazyWithRetry(() => import("./modules/Vendor/pages/Register"));
const VendorVerification = lazyWithRetry(() => import("./modules/Vendor/pages/Verification"));
const VendorForgotPassword = lazyWithRetry(() => import("./modules/Vendor/pages/ForgotPassword"));
const VendorProtectedRoute = lazyWithRetry(() => import("./modules/Vendor/components/VendorProtectedRoute"));
const VendorLayout = lazyWithRetry(() => import("./modules/Vendor/components/Layout/VendorLayout"));
const VendorReels = lazyWithRetry(() => import("./modules/Vendor/pages/Reels"));
const VendorDashboard = lazyWithRetry(() => import("./modules/Vendor/pages/Dashboard"));
const VendorProducts = lazyWithRetry(() => import("./modules/Vendor/pages/Products"));
const VendorManageProducts = lazyWithRetry(() => import("./modules/Vendor/pages/products/ManageProducts"));
const VendorAddProduct = lazyWithRetry(() => import("./modules/Vendor/pages/products/AddProduct"));
const VendorProductForm = lazyWithRetry(() => import("./modules/Vendor/pages/products/ProductForm"));
const VendorOrders = lazyWithRetry(() => import("./modules/Vendor/pages/Orders"));
const VendorAllOrders = lazyWithRetry(() => import("./modules/Vendor/pages/orders/AllOrders"));
const VendorOrderTracking = lazyWithRetry(() => import("./modules/Vendor/pages/orders/OrderTracking"));
const VendorOrderDetail = lazyWithRetry(() => import("./modules/Vendor/pages/orders/OrderDetail"));
const VendorInvoice = lazyWithRetry(() => import("./modules/Vendor/pages/orders/Invoice"));
const VendorAnalytics = lazyWithRetry(() => import("./modules/Vendor/pages/Analytics"));
const VendorEarnings = lazyWithRetry(() => import("./modules/Vendor/pages/Earnings"));
const VendorSettings = lazyWithRetry(() => import("./modules/Vendor/pages/Settings"));
const VendorSubscription = lazyWithRetry(() => import("./modules/Vendor/pages/Subscription"));
const VendorSupportTickets = lazyWithRetry(() => import("./modules/Vendor/pages/SupportTickets"));
const VendorHeroBannerBooking = lazyWithRetry(() => import("./modules/Vendor/pages/HeroBannerBooking"));
const VendorHeroBannerBookingDetail = lazyWithRetry(() => import("./modules/Vendor/pages/HeroBannerBookingDetail"));
const VendorStockManagement = lazyWithRetry(() => import("./modules/Vendor/pages/StockManagement"));

const VendorPickupLocations = lazyWithRetry(() => import("./modules/Vendor/pages/PickupLocations"));
const VendorReturnRequests = lazyWithRetry(() => import("./modules/Vendor/pages/ReturnRequests"));
const VendorReturnRequestDetail = lazyWithRetry(() => import("./modules/Vendor/pages/returns/ReturnRequestDetail"));
const VendorProductReviews = lazyWithRetry(() => import("./modules/Vendor/pages/ProductReviews"));
const VendorPromotions = lazyWithRetry(() => import("./modules/Vendor/pages/Promotions"));
const VendorNotifications = lazyWithRetry(() => import("./modules/Vendor/pages/Notifications"));
const VendorChat = lazyWithRetry(() => import("./modules/Vendor/pages/Chat"));
const VendorAllReels = lazyWithRetry(() => import("./modules/Vendor/pages/reels/AllReels"));
const VendorAddReel = lazyWithRetry(() => import("./modules/Vendor/pages/reels/AddReel"));
const VendorEditReel = lazyWithRetry(() => import("./modules/Vendor/pages/reels/EditReel"));
const VendorProductFAQs = lazyWithRetry(() => import("./modules/Vendor/pages/ProductFAQs"));
const VendorShippingManagement = lazyWithRetry(() => import("./modules/Vendor/pages/ShippingManagement"));
const VendorCustomers = lazyWithRetry(() => import("./modules/Vendor/pages/Customers"));
const VendorCustomerDetail = lazyWithRetry(() => import("./modules/Vendor/pages/CustomerDetail"));
const VendorProductAttributes = lazyWithRetry(() => import("./modules/Vendor/pages/ProductAttributes"));
const VendorAttributes = lazyWithRetry(() => import("./modules/Vendor/pages/attributes/Attributes"));
const VendorAttributeValues = lazyWithRetry(() => import("./modules/Vendor/pages/attributes/AttributeValues"));
const VendorAttributeSets = lazyWithRetry(() => import("./modules/Vendor/pages/attributes/AttributeSets"));
const VendorInventoryReports = lazyWithRetry(() => import("./modules/Vendor/pages/InventoryReports"));
const VendorPerformanceMetrics = lazyWithRetry(() => import("./modules/Vendor/pages/PerformanceMetrics"));

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
const B2BVendorAnalytics = lazyWithRetry(() => import("./modules/B2BVendor/pages/Analytics"));
const B2BVendorSettings = lazyWithRetry(() => import("./modules/B2BVendor/pages/Settings"));
const B2BVendorProfile = lazyWithRetry(() => import("./modules/B2BVendor/pages/Profile"));
const B2BVendorSubscription = lazyWithRetry(() => import("./modules/B2BVendor/pages/Subscription"));
const B2BVendorBannerBooking = lazyWithRetry(() => import("./modules/B2BVendor/pages/B2BBannerBooking"));
const B2BVendorPaymentPage = lazyWithRetry(() => import("./modules/B2BVendor/pages/PaymentPage"));

// B2B User App Routes
const B2BUserLogin = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Login"));
const B2BUserRegister = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Register"));
const B2BUserVerification = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Verification"));
const B2BUserDashboard = lazyWithRetry(() => import("./modules/B2BUserApp/pages/Dashboard"));
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

// Inner component that has access to useLocation
const AppRoutes = () => {
  // Test System Toast
  useEffect(() => {
    // toast.success("System Connected");
  }, []);

  // Initialize time warp testing cheat
  useTimeWarpCheat();

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
        <Route path="/b2b/personal-profile" element={<ProtectedRoute><B2BPersonalProfile /></ProtectedRoute>} />
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
          <Route path="orders/processing" element={<VendorAllOrders />} />
          <Route path="orders/ready-to-ship" element={<VendorAllOrders />} />
          <Route path="orders/dispatch-order" element={<VendorAllOrders />} />
          <Route path="orders/shipped-seller" element={<VendorAllOrders />} />
          <Route path="orders/canceled-order" element={<VendorAllOrders />} />
          <Route path="orders/prepaid-orders" element={<VendorAllOrders />} />
          <Route path="orders/cod-orders" element={<VendorAllOrders />} />
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
              <LandingPage />
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
          path="/app/become-seller"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileBecomeSeller />
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
          <CartDrawer />
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

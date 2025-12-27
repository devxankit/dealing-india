import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import React, { lazy, Suspense } from 'react';
import { Toaster } from "react-hot-toast";
import Home from "./modules/UserWeb/pages/Home";
import ProductDetail from "./modules/UserWeb/pages/ProductDetail";
import Checkout from "./modules/UserWeb/pages/Checkout";
import Search from "./modules/UserWeb/pages/Search";
import VendorStore from "./modules/UserWeb/pages/VendorStore";
import Login from "./modules/UserWeb/pages/Login";
import Register from "./modules/UserWeb/pages/Register";
import Verification from "./modules/UserWeb/pages/Verification";
import Profile from "./modules/UserWeb/pages/Profile";
import Orders from "./modules/UserWeb/pages/Orders";
import Addresses from "./modules/UserWeb/pages/Addresses";
import Wishlist from "./modules/UserWeb/pages/Wishlist";
import Offers from "./modules/UserWeb/pages/Offers";
import DailyDeals from "./modules/UserWeb/pages/DailyDeals";
import FlashSale from "./modules/UserWeb/pages/FlashSale";
import CampaignPage from "./modules/UserWeb/pages/CampaignPage";
import Category from "./modules/UserWeb/pages/Category";
import CartDrawer from "./shared/components/Cart/CartDrawer";
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
import AddProduct from "./modules/Admin/pages/products/AddProduct";
import BulkUpload from "./modules/Admin/pages/products/BulkUpload";
import TaxPricing from "./modules/Admin/pages/products/TaxPricing";
import ProductRatings from "./modules/Admin/pages/products/ProductRatings";
import ProductFAQs from "./modules/Admin/pages/products/ProductFAQs";
// Attribute Management child pages
import AttributeSets from "./modules/Admin/pages/attributes/AttributeSets";
import Attributes from "./modules/Admin/pages/attributes/Attributes";
import AttributeValues from "./modules/Admin/pages/attributes/AttributeValues";
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
// Delivery Management child pages
import DeliveryBoys from "./modules/Admin/pages/delivery/DeliveryBoys";
import CashCollection from "./modules/Admin/pages/delivery/CashCollection";
// Vendors child pages
import Vendors from "./modules/Admin/pages/Vendors";
import ManageVendors from "./modules/Admin/pages/vendors/ManageVendors";
import PendingApprovals from "./modules/Admin/pages/vendors/PendingApprovals";
import VendorDetail from "./modules/Admin/pages/vendors/VendorDetail";
import CommissionRates from "./modules/Admin/pages/vendors/CommissionRates";
import AdminVendorAnalytics from "./modules/Admin/pages/vendors/VendorAnalytics";
// Locations child pages
import Cities from "./modules/Admin/pages/locations/Cities";
import Zipcodes from "./modules/Admin/pages/locations/Zipcodes";
// Offers & Sliders child pages
import HomeSliders from "./modules/Admin/pages/offers/HomeSliders";
import FestivalOffers from "./modules/Admin/pages/offers/FestivalOffers";
// Mega Reward child pages
import MegaRewardEntries from "./modules/Admin/pages/mega-reward/Entries";
import MegaRewardWinners from "./modules/Admin/pages/mega-reward/Winners";
import MegaRewardSettings from "./modules/Admin/pages/mega-reward/Settings";
import MegaRewardPromotionalReels from "./modules/Admin/pages/mega-reward/PromotionalReels";
// Notifications child pages
import PushNotifications from "./modules/Admin/pages/notifications/PushNotifications";
import CustomMessages from "./modules/Admin/pages/notifications/CustomMessages";
// Support Desk child pages
import LiveChat from "./modules/Admin/pages/support/LiveChat";
import TicketTypes from "./modules/Admin/pages/support/TicketTypes";
import Tickets from "./modules/Admin/pages/support/Tickets";
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
import RouteWrapper from "./shared/components/RouteWrapper";
import ScrollToTop from "./shared/components/ScrollToTop";
import OrderConfirmation from "./modules/UserWeb/pages/OrderConfirmation";
import OrderDetailPage from "./modules/UserWeb/pages/OrderDetail";
import TrackOrder from "./modules/UserWeb/pages/TrackOrder";
// Mobile App Routes
// Mobile App Routes (Eager Loaded for Instant Nav)
import MobileHome from "./modules/UserApp/pages/Home";
import MobileCategories from "./modules/UserApp/pages/categories";
import MobileSearch from "./modules/UserApp/pages/Search";
import MobileReels from "./modules/UserApp/pages/Reels";
import MobileProfile from "./modules/UserApp/pages/Profile";
import MobileLogin from "./modules/UserApp/pages/Login";

// Mobile App Routes (Lazy Loaded)
const MobileProductDetail = lazy(() => import("./modules/UserApp/pages/ProductDetail"));
const MobileCategory = lazy(() => import("./modules/UserApp/pages/Category"));
const MobileCheckout = lazy(() => import("./modules/UserApp/pages/Checkout"));
const MobileRegister = lazy(() => import("./modules/UserApp/pages/Register"));
const MobileVerification = lazy(() => import("./modules/UserApp/pages/Verification"));
const MobileOrders = lazy(() => import("./modules/UserApp/pages/Orders"));
const MobileOrderDetail = lazy(() => import("./modules/UserApp/pages/OrderDetail"));
const MobileAddresses = lazy(() => import("./modules/UserApp/pages/Addresses"));
const MobileWishlist = lazy(() => import("./modules/UserApp/pages/Wishlist"));
const MobileOffers = lazy(() => import("./modules/UserApp/pages/Offers"));
const MobileDailyDeals = lazy(() => import("./modules/UserApp/pages/DailyDeals"));
const MobileFlashSale = lazy(() => import("./modules/UserApp/pages/FlashSale"));
const MobileTrackOrder = lazy(() => import("./modules/UserApp/pages/TrackOrder"));
const MobileOrderConfirmation = lazy(() => import("./modules/UserApp/pages/OrderConfirmation"));
const MobileMegaReward = lazy(() => import("./modules/UserApp/pages/MegaReward"));
// Delivery Routes
import DeliveryLogin from "./modules/Delivery/pages/Login";
import DeliveryProtectedRoute from "./modules/Delivery/components/DeliveryProtectedRoute";
import DeliveryLayout from "./modules/Delivery/components/Layout/DeliveryLayout";
import DeliveryDashboard from "./modules/Delivery/pages/Dashboard";
import DeliveryOrders from "./modules/Delivery/pages/Orders";
import DeliveryOrderDetail from "./modules/Delivery/pages/OrderDetail";
import DeliveryProfile from "./modules/Delivery/pages/Profile";
// Vendor Routes
import VendorLogin from "./modules/Vendor/pages/Login";
import VendorRegister from "./modules/Vendor/pages/Register";
import VendorVerification from "./modules/Vendor/pages/Verification";
import VendorProtectedRoute from "./modules/Vendor/components/VendorProtectedRoute";
import VendorLayout from "./modules/Vendor/components/Layout/VendorLayout";
import VendorReels from "./modules/Vendor/pages/Reels";
import VendorDashboard from "./modules/Vendor/pages/Dashboard";
import VendorProducts from "./modules/Vendor/pages/Products";
import VendorManageProducts from "./modules/Vendor/pages/products/ManageProducts";
import VendorAddProduct from "./modules/Vendor/pages/products/AddProduct";
import VendorBulkUpload from "./modules/Vendor/pages/products/BulkUpload";
import VendorProductForm from "./modules/Vendor/pages/products/ProductForm";
import VendorOrders from "./modules/Vendor/pages/Orders";
import VendorAllOrders from "./modules/Vendor/pages/orders/AllOrders";
import VendorOrderTracking from "./modules/Vendor/pages/orders/OrderTracking";
import VendorOrderDetail from "./modules/Vendor/pages/orders/OrderDetail";
import VendorAnalytics from "./modules/Vendor/pages/Analytics";
import VendorEarnings from "./modules/Vendor/pages/Earnings";
import VendorSettings from "./modules/Vendor/pages/Settings";
import VendorStockManagement from "./modules/Vendor/pages/StockManagement";
import VendorWalletHistory from "./modules/Vendor/pages/WalletHistory";
import VendorPickupLocations from "./modules/Vendor/pages/PickupLocations";
import VendorChat from "./modules/Vendor/pages/Chat";
import VendorReturnRequests from "./modules/Vendor/pages/ReturnRequests";
import VendorReturnRequestDetail from "./modules/Vendor/pages/returns/ReturnRequestDetail";
import VendorProductReviews from "./modules/Vendor/pages/ProductReviews";
import VendorPromotions from "./modules/Vendor/pages/Promotions";
import VendorNotifications from "./modules/Vendor/pages/Notifications";
import VendorAllReels from "./modules/Vendor/pages/reels/AllReels";
import VendorAddReel from "./modules/Vendor/pages/reels/AddReel";
import VendorEditReel from "./modules/Vendor/pages/reels/EditReel";
import VendorProductFAQs from "./modules/Vendor/pages/ProductFAQs";
import VendorTaxPricing from "./modules/Vendor/pages/TaxPricing";
import VendorShippingManagement from "./modules/Vendor/pages/ShippingManagement";
import VendorCustomers from "./modules/Vendor/pages/Customers";
import VendorCustomerDetail from "./modules/Vendor/pages/CustomerDetail";
import VendorSupportTickets from "./modules/Vendor/pages/SupportTickets";
import VendorProductAttributes from "./modules/Vendor/pages/ProductAttributes";
import VendorInventoryReports from "./modules/Vendor/pages/InventoryReports";
import VendorPerformanceMetrics from "./modules/Vendor/pages/PerformanceMetrics";
import VendorDocuments from "./modules/Vendor/pages/Documents";

// Inner component that has access to useLocation
const AppRoutes = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-800 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route
          path="/"
          element={
            <RouteWrapper>
              <Home />
            </RouteWrapper>
          }
        />
        <Route
          path="/product/:id"
          element={
            <RouteWrapper>
              <ProductDetail />
            </RouteWrapper>
          }
        />
        <Route
          path="/category/:id"
          element={
            <RouteWrapper>
              <Category />
            </RouteWrapper>
          }
        />
        <Route
          path="/vendor/:id"
          element={
            <RouteWrapper>
              <VendorStore />
            </RouteWrapper>
          }
        />
        <Route
          path="/checkout"
          element={
            <RouteWrapper>
              <Checkout />
            </RouteWrapper>
          }
        />
        <Route
          path="/search"
          element={
            <RouteWrapper>
              <Search />
            </RouteWrapper>
          }
        />
        <Route
          path="/login"
          element={
            <RouteWrapper>
              <Login />
            </RouteWrapper>
          }
        />
        <Route
          path="/register"
          element={
            <RouteWrapper>
              <Register />
            </RouteWrapper>
          }
        />
        <Route
          path="/verification"
          element={
            <RouteWrapper>
              <Verification />
            </RouteWrapper>
          }
        />
        <Route
          path="/wishlist"
          element={
            <RouteWrapper>
              <Wishlist />
            </RouteWrapper>
          }
        />
        <Route
          path="/offers"
          element={
            <RouteWrapper>
              <Offers />
            </RouteWrapper>
          }
        />
        <Route
          path="/daily-deals"
          element={
            <RouteWrapper>
              <DailyDeals />
            </RouteWrapper>
          }
        />
        <Route
          path="/flash-sale"
          element={
            <RouteWrapper>
              <FlashSale />
            </RouteWrapper>
          }
        />
        <Route
          path="/sale/:slug"
          element={
            <RouteWrapper>
              <CampaignPage />
            </RouteWrapper>
          }
        />
        <Route
          path="/campaign/:id"
          element={
            <RouteWrapper>
              <CampaignPage />
            </RouteWrapper>
          }
        />
        <Route
          path="/order-confirmation/:orderId"
          element={
            <RouteWrapper>
              <OrderConfirmation />
            </RouteWrapper>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <RouteWrapper>
              <OrderDetailPage />
            </RouteWrapper>
          }
        />
        <Route
          path="/track-order/:orderId"
          element={
            <RouteWrapper>
              <TrackOrder />
            </RouteWrapper>
          }
        />
        <Route
          path="/profile"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/orders"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
        <Route
          path="/addresses"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <Addresses />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
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
          <Route path="products/add-product" element={<AddProduct />} />
          <Route path="products/bulk-upload" element={<BulkUpload />} />
          <Route path="products/tax-pricing" element={<TaxPricing />} />
          <Route path="products/product-ratings" element={<ProductRatings />} />
          <Route path="products/product-faqs" element={<ProductFAQs />} />
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
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="attributes" element={<AttributeSets />} />
          <Route path="attributes/attribute-sets" element={<AttributeSets />} />
          <Route path="attributes/attributes" element={<Attributes />} />
          <Route
            path="attributes/attribute-values"
            element={<AttributeValues />}
          />
          <Route path="stock" element={<Inventory />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="delivery" element={<DeliveryBoys />} />
          <Route path="delivery/delivery-boys" element={<DeliveryBoys />} />
          <Route path="delivery/cash-collection" element={<CashCollection />} />
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
          <Route path="vendors/:id" element={<VendorDetail />} />
          <Route path="locations" element={<Cities />} />
          <Route path="locations/cities" element={<Cities />} />
          <Route path="locations/zipcodes" element={<Zipcodes />} />
          <Route path="offers" element={<HomeSliders />} />
          <Route path="offers/home-sliders" element={<HomeSliders />} />
          <Route path="offers/festival-offers" element={<FestivalOffers />} />
          <Route path="mega-reward" element={<Navigate to="/admin/mega-reward/entries" replace />} />
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
          <Route path="support" element={<Tickets />} />
          <Route path="support/live-chat" element={<LiveChat />} />
          <Route path="support/ticket-types" element={<TicketTypes />} />
          <Route path="support/tickets" element={<Tickets />} />
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
          <Route path="policies" element={<PrivacyPolicy />} />
          <Route path="policies/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="policies/refund-policy" element={<RefundPolicy />} />
          <Route path="policies/terms-conditions" element={<TermsConditions />} />
          <Route path="firebase" element={<PushConfig />} />
          <Route path="firebase/push-config" element={<PushConfig />} />
          <Route path="firebase/authentication" element={<Authentication />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="banners" element={<Banners />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="content" element={<Content />} />
        </Route>
        {/* Delivery Routes */}
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route
          path="/delivery"
          element={
            <DeliveryProtectedRoute>
              <DeliveryLayout />
            </DeliveryProtectedRoute>
          }>
          <Route index element={<Navigate to="/delivery/dashboard" replace />} />
          <Route path="dashboard" element={<DeliveryDashboard />} />
          <Route path="orders" element={<DeliveryOrders />} />
          <Route path="orders/:id" element={<DeliveryOrderDetail />} />
          <Route path="profile" element={<DeliveryProfile />} />
        </Route>
        {/* Vendor Routes */}
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/register" element={<VendorRegister />} />
        <Route path="/vendor/verification" element={<VendorVerification />} />
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
          <Route path="products/bulk-upload" element={<VendorBulkUpload />} />
          <Route path="products/product-faqs" element={<VendorProductFAQs />} />
          <Route path="products/tax-pricing" element={<VendorTaxPricing />} />
          <Route
            path="products/product-attributes"
            element={<VendorProductAttributes />}
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
          <Route path="reels" element={<VendorReels />} />
          <Route path="reels/all-reels" element={<VendorAllReels />} />
          <Route path="reels/add-reel" element={<VendorAddReel />} />
          <Route path="reels/edit-reel/:id" element={<VendorEditReel />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="earnings" element={<VendorEarnings />} />
          <Route path="earnings/overview" element={<VendorEarnings />} />
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
          <Route path="wallet-history" element={<VendorWalletHistory />} />
          <Route path="wallet-history/all-transactions" element={<VendorWalletHistory />} />
          <Route path="wallet-history/pending-payment" element={<VendorWalletHistory />} />
          <Route path="wallet-history/paid-payment" element={<VendorWalletHistory />} />
          <Route path="pickup-locations" element={<VendorPickupLocations />} />
          <Route path="chat" element={<VendorChat />} />
          <Route path="return-requests" element={<VendorReturnRequests />} />
          <Route
            path="return-requests/:id"
            element={<VendorReturnRequestDetail />}
          />
          <Route path="product-reviews" element={<VendorProductReviews />} />
          <Route path="promotions" element={<VendorPromotions />} />
          <Route path="notifications" element={<VendorNotifications />} />
          <Route
            path="shipping-management"
            element={<VendorShippingManagement />}
          />
          <Route path="customers/:id" element={<VendorCustomerDetail />} />
          <Route path="customers" element={<VendorCustomers />} />
          <Route path="support-tickets" element={<VendorSupportTickets />} />
          <Route path="support-tickets/:id" element={<VendorSupportTickets />} />
          <Route path="inventory-reports" element={<VendorInventoryReports />} />
          <Route
            path="performance-metrics"
            element={<VendorPerformanceMetrics />}
          />
          <Route path="documents" element={<VendorDocuments />} />
          <Route path="settings" element={<VendorSettings />} />
          <Route path="settings/store" element={<VendorSettings />} />
          <Route path="settings/payment" element={<VendorSettings />} />
          <Route path="settings/payment-settings" element={<VendorSettings />} />
          <Route path="settings/shipping" element={<VendorSettings />} />
          <Route path="settings/shipping-settings" element={<VendorSettings />} />
          <Route path="profile" element={<VendorSettings />} />
        </Route>
        {/* Mobile App Routes */}
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
          path="/app/mega-reward"
          element={
            <RouteWrapper>
              <ProtectedRoute>
                <MobileMegaReward />
              </ProtectedRoute>
            </RouteWrapper>
          }
        />
      </Routes>
    </Suspense>
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

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiTrendingUp,
  FiArrowRight,
} from "react-icons/fi";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useVendorStore } from "../store/vendorStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { useCommissionStore } from "../../../shared/store/commissionStore";
import { formatPrice } from "../../../shared/utils/helpers";
import { initializeFashionHubData } from "../../../shared/utils/initializeFashionHubData";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const { getVendorProducts, getVendorStats } = useVendorStore();
  const { getVendorOrders } = useOrderStore();
  const { getVendorEarningsSummary } = useCommissionStore();

  const [stats, setStats] = useState({
    totalProducts: 0,
    inStockProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });

  const vendorId = vendor?.id;

  // Initialize dummy data for Fashion Hub vendor (id: 1) on first load
  useEffect(() => {
    if (vendorId === 1) {
      // Check if data has already been initialized
      const hasInitialized = localStorage.getItem(
        "fashionhub-data-initialized"
      );
      if (!hasInitialized) {
        initializeFashionHubData();
        localStorage.setItem("fashionhub-data-initialized", "true");
      }
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorId) {
      // Get vendor statistics
      const vendorStats = getVendorStats(vendorId);
      if (vendorStats) {
        setStats((prev) => ({
          ...prev,
          totalProducts: vendorStats.totalProducts,
          inStockProducts: vendorStats.inStockProducts,
        }));
      }

      // Get vendor orders
      const orders = getVendorOrders(vendorId);
      setStats((prev) => ({
        ...prev,
        totalOrders: orders.length,
        pendingOrders: orders.filter(
          (o) => o.status === "pending" || o.status === "processing"
        ).length,
      }));

      // Get earnings summary
      const earningsSummary = getVendorEarningsSummary(vendorId);
      if (earningsSummary) {
        setStats((prev) => ({
          ...prev,
          totalEarnings: earningsSummary.totalEarnings,
          pendingEarnings: earningsSummary.pendingEarnings,
        }));
      }
    }
  }, [vendorId, getVendorStats, getVendorOrders, getVendorEarningsSummary]);

  const statCards = [
    {
      icon: FiPackage,
      label: "Total Products",
      value: stats.totalProducts,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      link: "/vendor/products",
    },
    {
      icon: FiShoppingBag,
      label: "Total Orders",
      value: stats.totalOrders,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      link: "/vendor/orders",
    },
    {
      icon: FiTrendingUp,
      label: "Pending Orders",
      value: stats.pendingOrders,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      link: "/vendor/orders",
    },
    {
      icon: FiDollarSign,
      label: "Total Earnings",
      value: formatPrice(stats.totalEarnings || 0),
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      link: "/vendor/earnings",
    },
  ];

  const recentOrders = useMemo(() => {
    if (!vendorId) return [];
    const orders = getVendorOrders(vendorId);
    return orders.slice(0, 5);
  }, [vendorId, getVendorOrders]);

  const vendorProducts = useMemo(() => {
    if (!vendorId) return [];
    return getVendorProducts(vendorId).slice(0, 5);
  }, [vendorId, getVendorProducts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Welcome back, {vendor?.storeName || vendor?.name}! Here's your store
            overview.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => stat.link && navigate(stat.link)}
            className={`${stat.bgColor} rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white text-xl" />
              </div>
              <FiArrowRight className={`${stat.textColor} text-lg`} />
            </div>
            <h3 className={`${stat.textColor} text-sm font-medium mb-1`}>
              {stat.label}
            </h3>
            <p className={`${stat.textColor} text-2xl font-bold`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/vendor/products/add-product")}
            className="flex items-center gap-3 p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-left">
            <div className="bg-primary-500 p-2 rounded-lg">
              <FiPackage className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Add New Product</h3>
              <p className="text-sm text-gray-600">
                Create a new product listing
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate("/vendor/orders")}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
            <div className="bg-green-500 p-2 rounded-lg">
              <FiShoppingBag className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">View Orders</h3>
              <p className="text-sm text-gray-600">Manage your orders</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/vendor/earnings")}
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
            <div className="bg-purple-500 p-2 rounded-lg">
              <FiDollarSign className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">View Earnings</h3>
              <p className="text-sm text-gray-600">Check your earnings</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Orders & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
            <button
              onClick={() => navigate("/vendor/orders")}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/vendor/orders/${order.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <div>
                    <p className="font-semibold text-gray-800">{order.id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      {formatPrice(order.total || 0)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        order.status === "delivered"
                          ? "bg-green-100 text-green-700"
                          : order.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Your Products</h2>
            <button
              onClick={() => navigate("/vendor/products")}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          {vendorProducts.length > 0 ? (
            <div className="space-y-3">
              {vendorProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/vendor/products/${product.id}`)}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPrice(product.price || 0)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.stock === "in_stock"
                        ? "bg-green-100 text-green-700"
                        : product.stock === "low_stock"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {product.stock === "in_stock"
                      ? "In Stock"
                      : product.stock === "low_stock"
                      ? "Low Stock"
                      : "Out of Stock"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No products yet</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VendorDashboard;

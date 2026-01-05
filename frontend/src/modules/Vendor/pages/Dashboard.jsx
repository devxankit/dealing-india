import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiPackage,
  FiShoppingBag,
  FiTrendingUp,
  FiArrowRight,
  FiDollarSign,
} from "react-icons/fi";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { formatPrice } from "../../../shared/utils/helpers";
import { IndianRupee } from "lucide-react";
import * as analyticsService from "../../../shared/services/analyticsService";
import { getVendorPerformanceMetrics } from "../services/performanceService";
import { useCommissionStore } from "../../../shared/store/commissionStore";
import { toast } from "react-hot-toast";
import TimePeriodFilter from "../../Admin/components/Analytics/TimePeriodFilter";
import RevenueLineChart from "../../Admin/components/Analytics/RevenueLineChart";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: {
      totalRevenue: 0,
      totalOrders: 0,
      totalProducts: 0,
      avgOrderValue: 0,
      customerCount: 0,
    },
    earnings: {
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
    },
    revenueData: [],
    topProducts: [],
    recentOrders: [],
  });

  const [error, setError] = useState(null);

  const vendorId = vendor?.id;

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!vendorId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await analyticsService.getVendorDashboardData(period);
        if (response && response.success) {
          setData(response.data);
        const response = await getVendorPerformanceMetrics(period);
        if (response) {
          setData(response);
        }
      } catch (error) {
        console.error("Error fetching vendor dashboard data:", error);
        setError("Failed to load dashboard data. Please try again.");
        // toast.error is handled by api interceptor
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [vendorId, period]);

  // Access commission store for accurate earnings/orders
  const { fetchEarningsStats, stats } = useCommissionStore();

  useEffect(() => {
    if (vendorId) {
      fetchEarningsStats();
    }
  }, [vendorId, fetchEarningsStats]);

  const statCards = [
    {
      icon: FiPackage,
      label: "Total Products",
      value: data.metrics.totalProducts,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      link: "/vendor/products",
    },
    {
      icon: FiShoppingBag,
      label: "Total Orders",
      // Use store stats if available, otherwise fall back to metrics
      value: stats?.totalOrders || data.metrics.totalOrders,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      link: "/vendor/orders",
    },
    {
      icon: FiTrendingUp,
      label: "Avg Order Value",
      value: formatPrice(data.metrics.avgOrderValue || 0),
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      link: "/vendor/orders",
    },
    {
      icon: IndianRupee,
      label: "Total Earnings",
      // Use store stats if available, otherwise fall back to metrics
      value: formatPrice(stats?.totalEarnings || data.earnings.totalEarnings || 0),
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      link: "/vendor/earnings",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-xl font-semibold">{error}</div>
        <button
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Welcome back, {vendor?.storeName || vendor?.name}! Here's your store
            overview.
          </p>
        </div>
        <TimePeriodFilter selectedPeriod={period} onPeriodChange={setPeriod} />
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

      {/* Revenue Trend Chart */}
      <div className="grid grid-cols-1 gap-6">
        <RevenueLineChart data={data.revenueData} period={period} />
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
              <IndianRupee className="text-white text-xl" />
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
          {data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
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
                      className={`text-xs px-2 py-1 rounded-full ${order.status === "delivered"
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
            <h2 className="text-lg font-bold text-gray-800">Top Products</h2>
            <button
              onClick={() => navigate("/vendor/products")}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          {data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((product) => (
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
                      Revenue: {formatPrice(product.revenue || 0)} • Sales: {product.sales}
                    </p>
                  </div>
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

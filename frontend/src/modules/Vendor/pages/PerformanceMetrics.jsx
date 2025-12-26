import { useState, useEffect } from "react";
import {
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiUsers,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorPerformanceMetrics } from "../services/performanceService";
import toast from "react-hot-toast";

const PerformanceMetrics = () => {
  const { vendor } = useVendorAuthStore();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    customerCount: 0,
  });
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  const vendorId = vendor?.id;

  // Fetch performance metrics from API
  useEffect(() => {
    const fetchPerformanceMetrics = async () => {
      if (!vendorId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getVendorPerformanceMetrics();

        if (response.success && response.data) {
          setMetrics(response.data.metrics || {
            totalRevenue: 0,
            totalOrders: 0,
            totalProducts: 0,
            avgOrderValue: 0,
            conversionRate: 0,
            customerCount: 0,
          });
          setEarnings(response.data.earnings || {
            totalEarnings: 0,
            pendingEarnings: 0,
            paidEarnings: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching performance metrics:", error);
        toast.error("Failed to load performance metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceMetrics();
  }, [vendorId]);

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view metrics</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <FiTrendingUp className="text-primary-600" />
          Performance Metrics
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Advanced analytics and performance tracking
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <FiDollarSign className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : formatPrice(metrics.totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <FiShoppingBag className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : metrics.totalOrders}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Products</p>
            <FiUsers className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : metrics.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average Order Value</p>
            <FiTrendingUp className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : formatPrice(metrics.avgOrderValue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Customers</p>
            <FiUsers className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : metrics.customerCount}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <FiTrendingUp className="text-pink-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : metrics.conversionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Revenue Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Earnings</span>
            <span className="font-bold">
              {loading ? "..." : formatPrice(earnings.totalEarnings)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Pending Earnings</span>
            <span className="font-semibold text-yellow-600">
              {loading ? "..." : formatPrice(earnings.pendingEarnings)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Paid Earnings</span>
            <span className="font-semibold text-green-600">
              {loading ? "..." : formatPrice(earnings.paidEarnings)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceMetrics;

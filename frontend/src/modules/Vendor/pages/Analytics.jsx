import { useState, useEffect } from "react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiPackage,
  FiShoppingBag,
} from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import RevenueLineChart from "../../Admin/components/Analytics/RevenueLineChart";
import SalesBarChart from "../../Admin/components/Analytics/SalesBarChart";
import OrderStatusPieChart from "../../Admin/components/Analytics/OrderStatusPieChart";
import RevenueVsOrdersChart from "../../Admin/components/Analytics/RevenueVsOrdersChart";
import TimePeriodFilter from "../../Admin/components/Analytics/TimePeriodFilter";
import ExportButton from "../../Admin/components/ExportButton";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import * as analyticsService from "../../../shared/services/analyticsService";
import toast from 'react-hot-toast';

const Analytics = () => {
  const { vendor } = useVendorAuthStore();
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [analyticsSummary, setAnalyticsSummary] = useState({
    totalRevenue: 0,
    pendingEarnings: 0,
    totalOrders: 0,
    totalProducts: 0,
    revenueChange: 0,
    ordersChange: 0
  });
  const [analyticsData, setAnalyticsData] = useState([]);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [summaryRes, chartRes] = await Promise.all([
          analyticsService.getVendorAnalyticsSummary(period),
          analyticsService.getVendorChartData(period)
        ]);

        if (summaryRes.success) {
          setAnalyticsSummary(summaryRes.data);
        }
        if (chartRes.success) {
          setAnalyticsData(chartRes.data);
        }
      } catch (error) {
        console.error('Error fetching vendor analytics:', error);
        // toast.error is handled by api interceptor
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [vendorId, period]);

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Analytics & Reports
          </h1>
          <p className="text-gray-600">Your store performance and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <TimePeriodFilter
            selectedPeriod={period}
            onPeriodChange={setPeriod}
          />
          <ExportButton
            data={analyticsData}
            headers={[
              { label: "Date", accessor: (row) => row.date },
              { label: "Revenue", accessor: (row) => formatPrice(row.revenue) },
              { label: "Orders", accessor: (row) => row.orders },
            ]}
            filename="vendor-analytics-report"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <IndianRupee className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(analyticsSummary.totalRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <FiTrendingUp className="text-green-600" />
            <span className="text-sm text-green-600">
              {analyticsSummary.revenueChange}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <FiShoppingBag className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {analyticsSummary.totalOrders}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <FiTrendingUp className="text-green-600" />
            <span className="text-sm text-green-600">
              {analyticsSummary.ordersChange}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Products</p>
            <FiPackage className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {analyticsSummary.totalProducts}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending Earnings</p>
            <FiBarChart2 className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(analyticsSummary.pendingEarnings)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Awaiting settlement</p>
        </div>
      </div>

      {/* Charts */}
      {analyticsData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueLineChart data={analyticsData} period={period} />
            <SalesBarChart data={analyticsData} period={period} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueVsOrdersChart data={analyticsData} period={period} />
            <OrderStatusPieChart />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <FiBarChart2 className="text-4xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No analytics data available</p>
          <p className="text-sm text-gray-400">
            Analytics will appear here once you start receiving orders
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default Analytics;

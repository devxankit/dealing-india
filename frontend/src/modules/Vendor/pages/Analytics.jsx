import { useState, useMemo, useEffect } from "react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
} from "react-icons/fi";
import { motion } from "framer-motion";
import RevenueLineChart from "../../Admin/components/Analytics/RevenueLineChart";
import SalesBarChart from "../../Admin/components/Analytics/SalesBarChart";
import OrderStatusPieChart from "../../Admin/components/Analytics/OrderStatusPieChart";
import RevenueVsOrdersChart from "../../Admin/components/Analytics/RevenueVsOrdersChart";
import TimePeriodFilter from "../../Admin/components/Analytics/TimePeriodFilter";
import ExportButton from "../../Admin/components/ExportButton";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { useVendorStore } from "../store/vendorStore";
import { useCommissionStore } from "../../../shared/store/commissionStore";

const Analytics = () => {
  const { vendor } = useVendorAuthStore();
  const { orders } = useOrderStore();
  const { getVendorProducts } = useVendorStore();
  const { getVendorEarningsSummary } = useCommissionStore();

  const [period, setPeriod] = useState("month");
  const [vendorOrders, setVendorOrders] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);

  const vendorId = vendor?.id;

  // Filter orders to only show those containing vendor's products
  useEffect(() => {
    if (!vendorId || !orders) {
      setVendorOrders([]);
      return;
    }

    const filtered = orders.filter((order) => {
      if (order.vendorItems && Array.isArray(order.vendorItems)) {
        return order.vendorItems.some((vi) => vi.vendorId === vendorId);
      }
      if (order.items && Array.isArray(order.items)) {
        return order.items.some((item) => item.vendorId === vendorId);
      }
      return false;
    });

    setVendorOrders(filtered);
  }, [vendorId, orders]);

  // Generate analytics data from vendor orders
  useEffect(() => {
    if (!vendorOrders.length) {
      setAnalyticsData([]);
      return;
    }

    // Group orders by date
    const ordersByDate = {};
    vendorOrders.forEach((order) => {
      const date = new Date(order.date).toISOString().split("T")[0];
      if (!ordersByDate[date]) {
        ordersByDate[date] = {
          date,
          revenue: 0,
          orders: 0,
        };
      }

      // Get vendor-specific order data
      const vendorItem = order.vendorItems?.find(
        (vi) => vi.vendorId === vendorId
      );
      if (vendorItem) {
        ordersByDate[date].revenue += vendorItem.subtotal || 0;
      } else {
        const vendorItems =
          order.items?.filter((item) => item.vendorId === vendorId) || [];
        const subtotal = vendorItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        ordersByDate[date].revenue += subtotal;
      }
      ordersByDate[date].orders += 1;
    });

    // Convert to array and sort by date
    const data = Object.values(ordersByDate).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Fill in missing dates for the last 30 days
    const today = new Date();
    const filledData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const existing = data.find((d) => d.date === dateStr);
      filledData.push(existing || { date: dateStr, revenue: 0, orders: 0 });
    }

    setAnalyticsData(filledData);
  }, [vendorOrders, vendorId]);

  // Calculate analytics summary
  const analyticsSummary = useMemo(() => {
    const vendorProducts = vendorId ? getVendorProducts(vendorId) : [];
    const earningsSummary = vendorId
      ? getVendorEarningsSummary(vendorId)
      : null;

    // Calculate revenue from orders
    let totalRevenue = 0;
    vendorOrders.forEach((order) => {
      const vendorItem = order.vendorItems?.find(
        (vi) => vi.vendorId === vendorId
      );
      if (vendorItem) {
        totalRevenue += vendorItem.subtotal || 0;
      } else {
        const vendorItems =
          order.items?.filter((item) => item.vendorId === vendorId) || [];
        totalRevenue += vendorItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      }
    });

    // Calculate recent period revenue (last 7 days)
    const recentRevenue = analyticsData
      .slice(-7)
      .reduce((sum, d) => sum + d.revenue, 0);

    // Calculate previous period revenue (7 days before that)
    const previousRevenue = analyticsData
      .slice(-14, -7)
      .reduce((sum, d) => sum + d.revenue, 0);

    const revenueChange =
      previousRevenue > 0
        ? (((recentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(
            1
          )
        : recentRevenue > 0
        ? 100
        : 0;

    // Calculate order counts
    const recentOrders = analyticsData
      .slice(-7)
      .reduce((sum, d) => sum + d.orders, 0);
    const previousOrders = analyticsData
      .slice(-14, -7)
      .reduce((sum, d) => sum + d.orders, 0);

    const ordersChange =
      previousOrders > 0
        ? (((recentOrders - previousOrders) / previousOrders) * 100).toFixed(1)
        : recentOrders > 0
        ? 100
        : 0;

    return {
      totalRevenue: earningsSummary?.totalEarnings || totalRevenue,
      pendingEarnings: earningsSummary?.pendingEarnings || 0,
      totalOrders: vendorOrders.length,
      totalProducts: vendorProducts.length,
      revenueChange: parseFloat(revenueChange),
      ordersChange: parseFloat(ordersChange),
    };
  }, [
    vendorOrders,
    analyticsData,
    vendorId,
    getVendorProducts,
    getVendorEarningsSummary,
  ]);

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view analytics</p>
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
            <FiDollarSign className="text-green-600" />
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

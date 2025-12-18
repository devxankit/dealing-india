import { useState, useMemo } from "react";
import { FiTrendingUp, FiCalendar } from "react-icons/fi";
import { motion } from "framer-motion";
import OrderTrendsLineChart from "../../components/Analytics/OrderTrendsLineChart";
import AnimatedSelect from "../../components/AnimatedSelect";
import { generateRevenueData } from "../../../../data/adminMockData";

const OrderTrends = () => {
  const [period, setPeriod] = useState("month");
  const revenueData = useMemo(() => generateRevenueData(30), []);

  const orderTrends = useMemo(() => {
    return revenueData.map((day) => ({
      date: day.date,
      orders: day.orders,
    }));
  }, [revenueData]);

  const totalOrders = orderTrends.reduce((sum, day) => sum + day.orders, 0);
  const averageOrders =
    orderTrends.length > 0 ? totalOrders / orderTrends.length : 0;
  const maxOrders = Math.max(...orderTrends.map((d) => d.orders), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Order Trends
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Analyze order patterns and trends
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <FiCalendar className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average Daily Orders</p>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {averageOrders.toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Peak Orders</p>
            <FiTrendingUp className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{maxOrders}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Order Trends Chart
          </h3>
          <AnimatedSelect
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "week", label: "Last 7 Days" },
              { value: "month", label: "Last 30 Days" },
              { value: "year", label: "Last Year" },
            ]}
            className="min-w-[140px]"
          />
        </div>
        <OrderTrendsLineChart data={revenueData} period={period} />
      </div>
    </motion.div>
  );
};

export default OrderTrends;

import { useState, useEffect } from "react";
import { FiTrendingUp, FiCalendar } from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import RevenueComparisonChart from "../../components/Analytics/RevenueComparisonChart";
import AnimatedSelect from "../../components/AnimatedSelect";
import * as analyticsService from "../../../../shared/services/analyticsService";
import { formatPrice } from '../../../../shared/utils/helpers';
import toast from 'react-hot-toast';

const RevenueOverview = () => {
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0
  });
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    const fetchFinanceData = async () => {
      setLoading(true);
      try {
        const [financeRes, chartRes] = await Promise.all([
          analyticsService.getAdminFinanceSummary(period),
          analyticsService.getAdminChartData(period)
        ]);

        if (financeRes.success) {
          setFinanceData(financeRes.data);
        }
        if (chartRes.success) {
          setRevenueData(chartRes.data);
        }
      } catch (error) {
        console.error('Error fetching finance data:', error);
        toast.error('Failed to load finance data');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { totalRevenue, totalOrders, averageOrderValue } = financeData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Revenue Overview
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Track revenue and sales performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <IndianRupee className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <FiCalendar className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average Order Value</p>
            <FiTrendingUp className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(averageOrderValue)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Revenue Chart</h3>
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
        <RevenueComparisonChart data={revenueData} period={period} />
      </div>
    </motion.div>
  );
};

export default RevenueOverview;

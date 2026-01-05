import { useState, useEffect } from "react";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import ProfitLossChart from "../../components/Analytics/ProfitLossChart";
import AnimatedSelect from "../../components/AnimatedSelect";
import * as analyticsService from "../../../../shared/services/analyticsService";
import { formatPrice } from '../../../../shared/utils/helpers';
import toast from 'react-hot-toast';

const ProfitLoss = () => {
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    totalRevenue: 0,
    costOfGoods: 0,
    operatingExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    profitMargin: 0
  });
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    const fetchProfitLossData = async () => {
      setLoading(true);
      try {
        const [financeRes, chartRes] = await Promise.all([
          analyticsService.getAdminFinanceSummary(period),
          analyticsService.getAdminChartData(period)
        ]);

        if (financeRes.success) {
          setFinancials({
            revenue: financeRes.data.totalRevenue,
            costOfGoods: financeRes.data.costOfGoods,
            operatingExpenses: financeRes.data.operatingExpenses,
            grossProfit: financeRes.data.grossProfit,
            netProfit: financeRes.data.netProfit,
            profitMargin: financeRes.data.profitMargin
          });
        }
        if (chartRes.success) {
          setRevenueData(chartRes.data);
        }
      } catch (error) {
        console.error('Error fetching profit/loss data:', error);
        toast.error('Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfitLossData();
  }, [period]);

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
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Profit & Loss
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View financial performance and profitability
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <AnimatedSelect
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={[
            { value: "month", label: "This Month" },
            { value: "quarter", label: "This Quarter" },
            { value: "year", label: "This Year" },
          ]}
          className="min-w-[140px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Income</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-bold text-green-600">
                {formatPrice(financials.revenue)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Expenses</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cost of Goods Sold</span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.costOfGoods)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Operating Expenses</span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.operatingExpenses)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                Total Expenses
              </span>
              <span className="font-bold text-red-600">
                {formatPrice(
                  financials.costOfGoods + financials.operatingExpenses
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Gross Profit</p>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(financials.grossProfit)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Net Profit</p>
            <IndianRupee className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(financials.netProfit)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Profit Margin</p>
            <FiTrendingDown className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {financials.profitMargin.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Financial Trends</h3>
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
        <ProfitLossChart data={revenueData} period={period} />
      </div>
    </motion.div>
  );
};

export default ProfitLoss;

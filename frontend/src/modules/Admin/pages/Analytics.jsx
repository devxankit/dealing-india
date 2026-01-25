import { useState, useEffect } from 'react';
import { FiBarChart2, FiTrendingUp, FiTrendingDown, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAdminAnalyticsSummary, useAdminChartData } from '../../../shared/hooks/useAdminAnalytics';
import RevenueChart from '../components/Analytics/RevenueChart';
import SalesChart from '../components/Analytics/SalesChart';
import TimePeriodFilter from '../components/Analytics/TimePeriodFilter';
import ExportButton from '../components/ExportButton';
import { formatCurrency } from '../utils/adminHelpers';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [period, setPeriod] = useState('month');
  
  // Use TanStack Query for analytics data
  const { 
    data: summaryResponse, 
    isLoading: summaryLoading,
  } = useAdminAnalyticsSummary(period);

  const { 
    data: chartResponse, 
    isLoading: chartLoading,
  } = useAdminChartData(period);

  const loading = summaryLoading || chartLoading;

  const analyticsSummary = useMemo(() => {
    return summaryResponse?.data || summaryResponse || {
      totalRevenue: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalCustomers: 0,
      revenueChange: 0,
      ordersChange: 0,
      productsChange: 0,
      customersChange: 0
    };
  }, [summaryResponse]);

  const revenueData = useMemo(() => {
    return chartResponse?.data || chartResponse || [];
  }, [chartResponse]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Analytics & Reports</h1>
          <p className="text-gray-600">Detailed analytics and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <TimePeriodFilter selectedPeriod={period} onPeriodChange={setPeriod} isLoading={loading} />
          <ExportButton
            data={revenueData}
            headers={[
              { label: 'Date', accessor: (row) => row.date },
              { label: 'Revenue', accessor: (row) => formatCurrency(row.revenue) },
              { label: 'Orders', accessor: (row) => row.orders },
            ]}
            filename="analytics_report"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {loading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <FiBarChart2 className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(analyticsSummary.totalRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <FiTrendingUp className="text-green-600" />
            <span className="text-sm text-green-600">{analyticsSummary.revenueChange}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <FiBarChart2 className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{analyticsSummary.totalOrders}</p>
          <div className="flex items-center gap-1 mt-2">
            <FiTrendingUp className="text-green-600" />
            <span className="text-sm text-green-600">{analyticsSummary.ordersChange}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Products</p>
            <FiBarChart2 className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{analyticsSummary.totalProducts}</p>
          <div className="flex items-center gap-1 mt-2">
            <FiTrendingUp className="text-green-600" />
            <span className="text-sm text-green-600">{analyticsSummary.productsChange}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Customers</p>
            <FiBarChart2 className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{analyticsSummary.totalCustomers}</p>
          <div className="flex items-center gap-1 mt-2">
            <FiTrendingUp className="text-green-600" />
            <span className="text-sm text-green-600">{analyticsSummary.customersChange}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {loading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )}
        <RevenueChart data={revenueData} period={period} />
        <SalesChart data={revenueData} period={period} />
      </div>
    </motion.div>
  );
};

export default Analytics;


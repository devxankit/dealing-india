import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatsCards from '../components/Analytics/StatsCards';
import RevenueLineChart from '../components/Analytics/RevenueLineChart';
import SalesBarChart from '../components/Analytics/SalesBarChart';
// import OrderStatusPieChart from '../components/Analytics/OrderStatusPieChart';
import CustomerGrowthAreaChart from '../components/Analytics/CustomerGrowthAreaChart';
import RevenueVsOrdersChart from '../components/Analytics/RevenueVsOrdersChart';
import TopProducts from '../components/Analytics/TopProducts';
import RecentOrders from '../components/Analytics/RecentOrders';
import OrderDetailsModal from '../components/OrderDetailsModal';
import TimePeriodFilter from '../components/Analytics/TimePeriodFilter';
import ExportButton from '../components/ExportButton';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/adminHelpers';
import { useDashboardSummary } from '../../../shared/hooks/useAdminAnalytics';
import { toast } from 'react-hot-toast';
import { useAdminAuthStore } from '../store/adminStore';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, initialize } = useAdminAuthStore();
  const [period, setPeriod] = useState('month');

  // Use TanStack Query for dashboard data
  const {
    data: dashboardResponse,
    isLoading: loading,
    error: queryError,
    refetch
  } = useDashboardSummary(period);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const data = useMemo(() => {
    return dashboardResponse?.data || dashboardResponse || {
      summary: {},
      revenueData: [],
      topProducts: [],
      orderStatus: [],
      recentOrders: [],
    };
  }, [dashboardResponse]);

  const error = useMemo(() => {
    if (queryError) {
      if (queryError.response?.status === 401 || queryError.message?.includes('401')) {
        return 'Your session has expired. Please login again.';
      }
      return 'Failed to load dashboard data. Please try again.';
    }
    return null;
  }, [queryError]);

  // Initialize admin auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('admin-token');
      if (token && !isAuthenticated) {
        try {
          await initialize();
        } catch (error) {
          console.error('Failed to initialize admin auth:', error);
        }
      }
    };
    initAuth();
  }, [isAuthenticated, initialize]);

  const handleExport = () => {
    // Export functionality will be handled by ExportButton component
  };

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
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Welcome back! Here's your business overview.</p>
        </div>
        <div className="flex items-center gap-2 w-full">
          <TimePeriodFilter selectedPeriod={period} onPeriodChange={setPeriod} />
          <ExportButton
            data={data.revenueData}
            headers={[
              { label: 'Date', accessor: (row) => row.date },
              { label: 'Revenue', accessor: (row) => formatCurrency(row.revenue) },
              { label: 'Orders', accessor: (row) => row.orders },
            ]}
            filename="revenue_report"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={data.statsCards || data.summary} />

      {/* Main Charts Row - Revenue and Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueLineChart data={data.revenueData} period={period} />
        <SalesBarChart data={data.revenueData} period={period} />
      </div>

      {/* Secondary Charts Row - Combined and Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueVsOrdersChart data={data.revenueData} period={period} />
        {/* <OrderStatusPieChart data={data.orderStatus} /> */}
      </div>

      {/* Customer Growth Chart - Full Width */}
      <div className="grid grid-cols-1 gap-6">
        <CustomerGrowthAreaChart data={data.revenueData} period={period} />
      </div>

      {/* Products and Orders Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts products={data.topProducts} />
        <RecentOrders
          orders={data.recentOrders}
          onViewOrder={(order) => {
            setSelectedOrder(order);
            setIsOrderModalOpen(true);
          }}
        />
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrder(null);
        }}
      />
    </motion.div>
  );
};

export default Dashboard;

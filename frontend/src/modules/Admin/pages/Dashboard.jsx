import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatsCards from '../components/Analytics/StatsCards';
import RevenueLineChart from '../components/Analytics/RevenueLineChart';
import SalesBarChart from '../components/Analytics/SalesBarChart';
import OrderStatusPieChart from '../components/Analytics/OrderStatusPieChart';
import CustomerGrowthAreaChart from '../components/Analytics/CustomerGrowthAreaChart';
import RevenueVsOrdersChart from '../components/Analytics/RevenueVsOrdersChart';
import TopProducts from '../components/Analytics/TopProducts';
import RecentOrders from '../components/Analytics/RecentOrders';
import TimePeriodFilter from '../components/Analytics/TimePeriodFilter';
import ExportButton from '../components/ExportButton';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/adminHelpers';
import { getDashboardSummary } from '../services/reportService';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: [],
    revenueData: [],
    topProducts: [],
    orderStatus: [],
    recentOrders: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await getDashboardSummary(period);
        if (response) {
          setData(response);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

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
      <StatsCards stats={data.summary} />

      {/* Main Charts Row - Revenue and Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueLineChart data={data.revenueData} period={period} />
        <SalesBarChart data={data.revenueData} period={period} />
      </div>

      {/* Secondary Charts Row - Combined and Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueVsOrdersChart data={data.revenueData} period={period} />
        <OrderStatusPieChart data={data.orderStatus} />
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
          onViewOrder={(order) => navigate(`/admin/orders/${order.id}`)}
        />
      </div>
    </motion.div>
  );
};

export default Dashboard;

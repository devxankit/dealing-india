import { useState, useMemo } from 'react';
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
import { generateRevenueData, mockOrders, topProducts, getAnalyticsSummary } from '../../../data/adminMockData';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/adminHelpers';

const Dashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  
  const revenueData = useMemo(() => generateRevenueData(30), []);
  const analyticsSummary = useMemo(() => getAnalyticsSummary(), []);

  const handleExport = () => {
    const headers = [
      { label: 'Date', accessor: (row) => row.date },
      { label: 'Revenue', accessor: (row) => formatCurrency(row.revenue) },
      { label: 'Orders', accessor: (row) => row.orders },
    ];
    // Export functionality will be handled by ExportButton component
  };

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
            data={revenueData}
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
      <StatsCards stats={analyticsSummary} />

      {/* Main Charts Row - Revenue and Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueLineChart data={revenueData} period={period} />
        <SalesBarChart data={revenueData} period={period} />
      </div>

      {/* Secondary Charts Row - Combined and Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueVsOrdersChart data={revenueData} period={period} />
        <OrderStatusPieChart />
      </div>

      {/* Customer Growth Chart - Full Width */}
      <div className="grid grid-cols-1 gap-6">
        <CustomerGrowthAreaChart data={revenueData} period={period} />
      </div>

      {/* Products and Orders Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts products={topProducts} />
        <RecentOrders
          orders={mockOrders}
          onViewOrder={(order) => navigate(`/admin/orders/${order.id}`)}
        />
      </div>
    </motion.div>
  );
};

export default Dashboard;

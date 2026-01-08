import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, 
  FiTrendingUp, 
  FiShoppingBag, 
  FiFilter, 
  FiDownload, 
  FiRefreshCw,
  FiSearch,
  FiEye
} from 'react-icons/fi';
import { useCustomerStore } from '../../../../shared/store/customerStore';
import CustomerRegistrationCharts from './components/CustomerRegistrationCharts';
import CustomerDetailModal from './components/CustomerDetailModal';
import { formatPrice } from '../../../../shared/utils/helpers';
import DataTable from '../../components/DataTable';
import toast from 'react-hot-toast';

const CustomerAnalytics = () => {
  const navigate = useNavigate();
  const { fetchCustomerAnalytics } = useCustomerStore();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetchCustomerAnalytics();
      if (response) {
        setAnalyticsData(response);
      }
    } catch (error) {
      toast.error('Failed to load customer analytics');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    toast.success('Analytics updated');
  };

  const filteredCustomers = useMemo(() => {
    if (!analyticsData?.customers) return [];
    if (!searchQuery.trim()) return analyticsData.customers;
    
    const query = searchQuery.toLowerCase();
    return analyticsData.customers.filter(item => 
      item.customer?.name?.toLowerCase().includes(query) || 
      item.customer?.email?.toLowerCase().includes(query) ||
      item.customer?.phone?.toLowerCase().includes(query)
    );
  }, [analyticsData?.customers, searchQuery]);

  const stats = [
    {
      title: 'Total Customers',
      value: analyticsData?.overall?.totalCustomers || 0,
      icon: FiUsers,
      color: 'blue',
      trend: '+12%', // This could be calculated from backend
    },
    {
      title: 'Total Orders',
      value: analyticsData?.overall?.totalOrders || 0,
      icon: FiShoppingBag,
      color: 'green',
      trend: '+8%',
    },
    {
      title: 'Avg. Order Value',
      value: formatPrice(
        analyticsData?.overall?.totalOrders > 0 
          ? analyticsData?.overall?.totalRevenue / analyticsData?.overall?.totalOrders 
          : 0
      ),
      icon: FiTrendingUp,
      color: 'orange',
      trend: '+5%',
    },
  ];

  const handleViewDetails = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsModalOpen(true);
  };

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">
            {customer?.name?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="font-semibold text-gray-800">{customer?.name}</div>
            <div className="text-xs text-gray-500">{customer?.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'stats',
      label: 'Total Spent',
      render: (stats) => <span className="font-bold text-gray-900">{formatPrice(stats?.totalSpend || 0)}</span>,
    },
    {
      key: 'stats',
      label: 'Orders',
      render: (stats) => <span>{stats?.totalOrders || 0}</span>,
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <button
          onClick={() => handleViewDetails(row.customer?.id || row.customer?._id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
        >
          <FiEye size={14} />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Analysis</h1>
          <p className="text-gray-500">Insights into customer behavior and registration trends</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors ${refreshing ? 'opacity-50' : ''}`}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            <FiDownload />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon size={24} />
              </div>
              <span className="text-green-500 text-sm font-medium flex items-center">
                {stat.trend}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Registration Charts */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Customer Acquisition</h2>
        <CustomerRegistrationCharts />
      </div>

      {/* Top Customers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-800">Top Spending Customers</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full sm:w-64"
              />
            </div>
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none">
                <option>All Time</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredCustomers}
          isLoading={loading}
          pagination={false}
        />
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerId={selectedCustomerId}
      />
    </div>
  );
};

export default CustomerAnalytics;

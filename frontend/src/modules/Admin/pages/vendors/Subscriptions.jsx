import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiUsers, FiSettings, FiActivity } from 'react-icons/fi';
import { IndianRupee } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatsCards from '../../components/Analytics/StatsCards';
import RevenueChart from '../../components/Analytics/RevenueChart';
import SupportTickets from '../supportTickets/SupportTickets';
import EditTierModal from '../../components/EditTierModal';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const Subscriptions = () => {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'analytics';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  const handleTabChange = (tab) => {
     setActiveTab(tab);
     const url = new URL(window.location);
     url.searchParams.set('tab', tab);
     window.history.pushState({}, '', url);
   };

  const [analytics, setAnalytics] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [monitoringData, setMonitoringData] = useState([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    subscriptionId: '',
    action: '',
    days: ''
  });
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Fetch tiers from backend
  const fetchTiers = async () => {
    try {
      // Include inactive tiers for admin management
      const response = await api.get('/admin/subscriptions/tiers?includeInactive=true');
      if (response.success && response.data) {
        // Transform backend format to frontend format
        const transformedTiers = response.data.map(tier => ({
          ...tier,
          id: tier._id || tier.id,
          features: tier.features?.map(f => typeof f === 'string' ? f : f.name || '') || []
        }));
        setTiers(transformedTiers);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
      toast.error('Failed to load subscription tiers');
      // Fallback to mock data if API fails
      const mockTiers = [
        { 
          id: '1', 
          name: 'Free', 
          priceMonthly: 0, 
          reelLimit: 0, 
          extraReelPrice: 10,
          features: ['Cost per reel upload: ₹10', 'Basic features', 'Automatic activation'],
          isActive: true 
        },
        { 
          id: '2', 
          name: 'Starter', 
          priceMonthly: 99, 
          reelLimit: 30, 
          extraReelPrice: 10,
          features: ['30 reels per month', 'Additional reels at ₹10 each', 'Standard features'],
          isActive: true 
        },
        { 
          id: '3', 
          name: 'Professional', 
          priceMonthly: 299, 
          reelLimit: 100, 
          extraReelPrice: 10,
          features: ['100 reels per month', 'Additional reels at ₹10 each', 'Enhanced features'],
          isActive: true 
        },
        { 
          id: '4', 
          name: 'Premium', 
          priceMonthly: 499, 
          reelLimit: -1, 
          extraReelPrice: 0,
          features: ['Unlimited reel uploads', 'Premium features', 'Priority support'],
          isActive: true 
        }
      ];
      setTiers(mockTiers);
    }
  };

  useEffect(() => {
    loadAnalytics();
    fetchTiers();
    if (activeTab === 'monitoring') {
      loadMonitoring();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/subscriptions/analytics');
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        toast.error('Failed to load analytics data');
        // Set empty data structure to prevent errors
        setAnalytics({
          revenue: 0,
          activeSubscriptions: 0,
          monthlyGrowth: '+0%',
          churnRate: '0%',
          tierDistribution: [],
          recentPayments: [],
          revenueData: []
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
      // Set empty data structure to prevent errors
      setAnalytics({
        revenue: 0,
        activeSubscriptions: 0,
        monthlyGrowth: '+0%',
        churnRate: '0%',
        tierDistribution: [],
        recentPayments: [],
        revenueData: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = async () => {
    try {
      setMonitoringLoading(true);
      const response = await api.get('/admin/subscriptions/monitoring');
      if (response.success && response.data) {
        setMonitoringData(response.data);
      } else {
        toast.error('Failed to load monitoring data');
        setMonitoringData([]);
      }
    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast.error('Failed to load monitoring data');
      setMonitoringData([]);
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleEditTier = (tier) => {
    setSelectedTier(tier);
    setIsEditModalOpen(true);
  };

  const handleTierUpdateSuccess = (updatedTier) => {
    // Update the tier in the list
    setTiers(prevTiers => 
      prevTiers.map(tier => 
        (tier._id === updatedTier._id || tier.id === updatedTier._id) 
          ? {
              ...updatedTier,
              id: updatedTier._id || updatedTier.id,
              features: updatedTier.features?.map(f => typeof f === 'string' ? f : f.name || '') || []
            }
          : tier
      )
    );
    toast.success('Tier updated successfully! Changes will reflect on vendor side.');
  };

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!overrideForm.subscriptionId || !overrideForm.action) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setOverrideLoading(true);
      const details = overrideForm.action === 'extend_custom' ? { days: parseInt(overrideForm.days) } : {};
      
      const response = await api.post('/admin/subscriptions/manual-override', {
        subscriptionId: overrideForm.subscriptionId,
        action: overrideForm.action,
        details
      });

      if (response.success) {
        toast.success(response.message || 'Action applied successfully');
        setOverrideForm({ subscriptionId: '', action: '', days: '' });
        // Reload monitoring data if on monitoring tab
        if (activeTab === 'monitoring') {
          loadMonitoring();
        }
      } else {
        throw new Error(response.message || 'Failed to apply action');
      }
    } catch (error) {
      console.error('Error applying manual override:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to apply action');
    } finally {
      setOverrideLoading(false);
    }
  };

  const stats = [
    { title: 'Total Revenue', value: `₹${(analytics?.revenue || 0).toLocaleString()}`, icon: <IndianRupee />, color: 'blue' },
    { title: 'Active Subscriptions', value: analytics?.activeSubscriptions || 0, icon: <FiUsers />, color: 'green' },
    { title: 'Monthly Growth', value: analytics?.monthlyGrowth || '+0%', icon: <FiTrendingUp />, color: 'purple' },
    { title: 'Churn Rate', value: analytics?.churnRate || '0%', icon: <FiActivity />, color: 'red' }
  ];

  const columns = [
    { label: 'Vendor', key: 'vendor' },
    { label: 'Amount', key: 'amount', render: (val) => `₹${val}` },
    { label: 'Tier', key: 'tier' },
    { label: 'Date', key: 'date' },
    { 
      label: 'Status', 
      key: 'status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          val === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {val?.charAt(0).toUpperCase() + val?.slice(1)}
        </span>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Subscription Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Monitor revenue, manage tiers, and support vendor subscriptions.</p>
        </div>
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'analytics', label: 'Analytics' },
            { id: 'tiers', label: 'Tier Config' },
            { id: 'monitoring', label: 'Monitoring' },
            { id: 'support', label: 'Support Tools' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analytics' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 lg:space-y-8"
        >
          <StatsCards stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 xl:col-span-8">
              <RevenueChart data={analytics?.revenueData || []} />
            </div>
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Tier Distribution</h3>
                <div className="flex items-end justify-around h-64 gap-2">
                  {analytics?.tierDistribution.map((tier) => {
                    const maxCount = Math.max(...analytics.tierDistribution.map(t => t.count));
                    const height = (tier.count / maxCount) * 100;
                    return (
                      <div key={tier.name} className="flex flex-col items-center flex-1 group">
                        <div className="w-full max-w-[40px] relative">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            className="bg-blue-500 rounded-t-lg transition-all group-hover:bg-blue-600 shadow-sm"
                          ></motion.div>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {tier.count} vendors
                          </div>
                        </div>
                        <span className="mt-3 font-semibold text-xs text-gray-700 text-center">{tier.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Recent Payments</h3>
            </div>
            <DataTable columns={columns} data={analytics?.recentPayments || []} className="border-none shadow-none rounded-none" />
          </div>
        </motion.div>
      )}

      {activeTab === 'tiers' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div key={tier.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tier.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleEditTier(tier)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit tier settings"
                  >
                    <FiSettings className="text-lg" />
                  </button>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-blue-600">₹{tier.priceMonthly}</span>
                    <span className="text-sm text-gray-500 font-medium">/month</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    {tier.reelLimit === -1 ? 'Unlimited reel uploads' : `${tier.reelLimit} reels included`}
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600 group">
                      <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mr-3 mt-0.5 group-hover:bg-green-100 transition-colors">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handleEditTier(tier)}
                  className="w-full py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-all active:scale-[0.98]"
                >
                  Edit Plan Details
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'monitoring' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {monitoringLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">Loading subscriptions...</p>
              </div>
            ) : (
              <DataTable 
                columns={[
                  { label: 'Vendor', key: 'vendor' },
                  { 
                    label: 'Status', 
                    key: 'status',
                    render: (val) => (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        val === 'active' ? 'bg-green-100 text-green-800' : 
                        val === 'expired' ? 'bg-red-100 text-red-800' :
                        val === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {val?.charAt(0).toUpperCase() + val?.slice(1)}
                      </span>
                    )
                  },
                  { label: 'Tier', key: 'tier' },
                  { label: 'Expiry Date', key: 'expiry' },
                  { label: 'Auto Renew', key: 'renew', render: (val) => val ? 'Yes' : 'No' }
                ]} 
                data={monitoringData} 
              />
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'support' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Manual Override</h3>
              <p className="text-sm text-gray-500 mb-6">Manually adjust subscription end dates or status for specific vendors.</p>
              <form onSubmit={handleManualOverride} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription ID</label>
                  <input 
                    type="text" 
                    value={overrideForm.subscriptionId}
                    onChange={(e) => setOverrideForm({ ...overrideForm, subscriptionId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Enter subscription ID..." 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select 
                    value={overrideForm.action}
                    onChange={(e) => setOverrideForm({ ...overrideForm, action: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Select an action...</option>
                    <option value="extend_30_days">Extend 30 Days</option>
                    <option value="extend_custom">Extend Custom Days</option>
                    <option value="grant_premium_trial">Grant Premium Trial</option>
                    <option value="cancel_subscription">Cancel Subscription</option>
                    <option value="reactivate">Reactivate Subscription</option>
                  </select>
                </div>
                {overrideForm.action === 'extend_custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                    <input 
                      type="number" 
                      value={overrideForm.days}
                      onChange={(e) => setOverrideForm({ ...overrideForm, days: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="Enter number of days..." 
                      min="1"
                      required
                    />
                  </div>
                )}
                <button 
                  type="submit"
                  disabled={overrideLoading}
                  className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {overrideLoading ? 'Processing...' : 'Apply Action'}
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <SupportTickets />
            </div>
          </div>
        </motion.div>
      )}

      {/* Edit Tier Modal */}
      <EditTierModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTier(null);
        }}
        tier={selectedTier}
        onSuccess={handleTierUpdateSuccess}
      />
    </div>
  );
};

export default Subscriptions;

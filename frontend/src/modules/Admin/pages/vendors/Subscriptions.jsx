import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiUsers, FiDollarSign, FiSettings, FiActivity } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import StatsCards from '../../components/Analytics/StatsCards';
import RevenueChart from '../../components/Analytics/RevenueChart';

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

  useEffect(() => {
    // Mock data for initial development
    const mockAnalytics = {
      revenue: 125000,
      activeSubscriptions: 450,
      tierDistribution: [
        { name: 'Free', count: 100 },
        { name: 'Starter', count: 200 },
        { name: 'Professional', count: 100 },
        { name: 'Premium', count: 50 }
      ],
      recentPayments: [
        { id: '1', vendor: 'Tech Store', amount: 299, tier: 'Professional', date: '2023-12-01', status: 'completed' },
        { id: '2', vendor: 'Fashion Hub', amount: 499, tier: 'Premium', date: '2023-12-01', status: 'completed' },
        { id: '3', vendor: 'Gadget World', amount: 99, tier: 'Starter', date: '2023-11-30', status: 'completed' }
      ],
      revenueData: [
        { date: '2023-12-01', revenue: 5000, orders: 10 },
        { date: '2023-11-30', revenue: 4500, orders: 8 },
        { date: '2023-11-29', revenue: 6000, orders: 12 },
        { date: '2023-11-28', revenue: 3000, orders: 5 }
      ]
    };

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

    setAnalytics(mockAnalytics);
    setTiers(mockTiers);
    setLoading(false);
  }, []);

  const stats = [
    { title: 'Total Revenue', value: `$${analytics?.revenue.toLocaleString()}`, icon: <FiDollarSign />, color: 'blue' },
    { title: 'Active Subscriptions', value: analytics?.activeSubscriptions, icon: <FiUsers />, color: 'green' },
    { title: 'Monthly Growth', value: '+12%', icon: <FiTrendingUp />, color: 'purple' },
    { title: 'Churn Rate', value: '2.4%', icon: <FiActivity />, color: 'red' }
  ];

  const columns = [
    { label: 'Vendor', key: 'vendor' },
    { label: 'Amount', key: 'amount', render: (val) => `$${val}` },
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
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
                <button className="w-full py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-all active:scale-[0.98]">
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
            <DataTable 
              columns={[
                { label: 'Vendor', key: 'vendor' },
                { label: 'Status', key: 'status' },
                { label: 'Tier', key: 'tier' },
                { label: 'Expiry Date', key: 'expiry' },
                { label: 'Auto Renew', key: 'renew', render: (val) => val ? 'Yes' : 'No' }
              ]} 
              data={[
                { vendor: 'Tech Store', status: 'Active', tier: 'Professional', expiry: '2024-06-01', renew: true },
                { vendor: 'Fashion Hub', status: 'Expiring Soon', tier: 'Premium', expiry: '2023-12-15', renew: false },
                { vendor: 'Gadget World', status: 'Active', tier: 'Starter', expiry: '2024-01-10', renew: true }
              ]} 
            />
          </div>
        </motion.div>
      )}

      {activeTab === 'support' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Manual Override</h3>
              <p className="text-sm text-gray-500 mb-6">Manually adjust subscription end dates or status for specific vendors.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID / Email</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter vendor details..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>Extend 30 Days</option>
                    <option>Grant Premium Trial</option>
                    <option>Refund Last Payment</option>
                    <option>Cancel Subscription</option>
                  </select>
                </div>
                <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                  Apply Action
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Support Tickets (Subscriptions)</h3>
              <div className="space-y-4">
                {[
                  { id: '1', vendor: 'Electronics Plus', issue: 'Payment failed but amount deducted', priority: 'High' },
                  { id: '2', vendor: 'Home Decor', issue: 'Requesting refund for accidental upgrade', priority: 'Medium' }
                ].map((ticket) => (
                  <div key={ticket.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-800">{ticket.vendor}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ticket.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {ticket.priority}
                      priority</span>
                    </div>
                    <p className="text-xs text-gray-600">{ticket.issue}</p>
                  </div>
                ))}
                <button className="w-full py-2 text-blue-600 font-semibold text-sm hover:underline">
                  View All Subscription Tickets
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Subscriptions;

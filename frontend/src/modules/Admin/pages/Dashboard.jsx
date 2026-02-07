import { motion } from 'framer-motion';
import {
  FiUsers, FiUserCheck, FiPackage, FiHome, FiZap, FiImage,
  FiTrendingUp, FiTrendingDown, FiPhone, FiMessageCircle,
  FiAlertCircle, FiCheckCircle, FiClock, FiXCircle
} from 'react-icons/fi';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { dashboardMockData } from '../config/dashboardMockData';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

const Dashboard = () => {
  const {
    summary, vendorDistribution, subscriptions,
    listingHealth, banners, interactions,
    performance, alerts
  } = dashboardMockData;

  const iconMap = {
    FiUsers: <FiUsers />,
    FiUserCheck: <FiUserCheck />,
    FiPackage: <FiPackage />,
    FiHome: <FiHome />,
    FiZap: <FiZap />,
    FiImage: <FiImage />
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-2 lg:p-6 bg-gray-50/30 min-h-screen"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Overview</h1>
          <p className="text-gray-500 font-medium">Real-time B2B Platform Analytics (Live View)</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-bold text-gray-700">System Live</span>
        </div>
      </div>

      {/* Section 1: Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summary.map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100/50"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 bg-${item.color}-50 text-${item.color}-600`}>
              {iconMap[item.icon]}
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{item.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-black text-gray-900">{item.value}</h3>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${item.trendType === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {item.trendType === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                {item.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Vendor Distribution */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="text-lg font-black text-gray-900 mb-6">Vendor Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorDistribution}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vendorDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {vendorDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs font-bold text-gray-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Subscription Overview */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Products', data: subscriptions.product, icon: <FiPackage />, color: 'blue' },
            { title: 'Properties', data: subscriptions.property, icon: <FiHome />, color: 'orange' },
            { title: 'Banners', data: subscriptions.banner, icon: <FiImage />, color: 'pink' },
          ].map((sub, i) => (
            <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-2xl bg-${sub.color}-50 text-${sub.color}-600 text-lg`}>
                  {sub.icon}
                </div>
                <h4 className="font-black text-gray-800">{sub.title}</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-bold">Active</span>
                  <span className="text-green-600 font-black">{sub.data.active}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <div className="flex justify-between gap-2">
                  <div className="bg-orange-50 p-3 rounded-2xl flex-1 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-orange-600 uppercase">Expiring</span>
                    <span className="text-lg font-black text-orange-700">{sub.data.expiringSoon}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-2xl flex-1 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-red-600 uppercase">Expired</span>
                    <span className="text-lg font-black text-red-700">{sub.data.expired}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Section 4: Listing Health */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <h3 className="text-xl font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">Listing Health Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Products */}
            <div className="space-y-6">
              <h4 className="flex items-center gap-2 text-primary-600 font-black uppercase text-xs tracking-widest">
                <FiPackage /> Products
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-blue-50/50 border border-blue-100">
                  <div className="text-blue-600 text-xs font-bold uppercase mb-1">Items</div>
                  <div className="text-xl font-black text-blue-900">{listingHealth.products.total.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-green-50/50 border border-green-100">
                  <div className="text-green-600 text-xs font-bold uppercase mb-1">Live</div>
                  <div className="text-xl font-black text-green-900">{listingHealth.products.approved.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-amber-50/50 border border-amber-100">
                  <div className="text-amber-600 text-xs font-bold uppercase mb-1">Queue</div>
                  <div className="text-xl font-black text-amber-900">{listingHealth.products.pending}</div>
                </div>
                <div className="p-4 rounded-3xl bg-red-50/50 border border-red-100">
                  <div className="text-red-600 text-xs font-bold uppercase mb-1">Offline</div>
                  <div className="text-xl font-black text-red-900">{listingHealth.products.disabled}</div>
                </div>
              </div>
            </div>
            {/* Properties */}
            <div className="space-y-6">
              <h4 className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-widest">
                <FiHome /> Properties
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100">
                  <div className="text-indigo-600 text-xs font-bold uppercase mb-1">Assets</div>
                  <div className="text-xl font-black text-indigo-900">{listingHealth.properties.total.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-green-50/50 border border-green-100">
                  <div className="text-green-600 text-xs font-bold uppercase mb-1">Live</div>
                  <div className="text-xl font-black text-green-900">{listingHealth.properties.approved.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-amber-50/50 border border-amber-100">
                  <div className="text-amber-600 text-xs font-bold uppercase mb-1">Queue</div>
                  <div className="text-xl font-black text-amber-900">{listingHealth.properties.pending}</div>
                </div>
                <div className="p-4 rounded-3xl bg-red-50/50 border border-red-100">
                  <div className="text-red-600 text-xs font-bold uppercase mb-1">Offline</div>
                  <div className="text-xl font-black text-red-900">{listingHealth.properties.disabled}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 & 8: Banners and Alerts */}
        <div className="space-y-6">
          {/* Banners */}
          <div className="bg-gradient-to-br from-indigo-700 to-primary-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <FiImage size={120} />
            </div>
            <h3 className="text-lg font-black mb-6 uppercase tracking-widest">Promotion Snapshot</h3>
            <div className="flex gap-8">
              <div>
                <div className="text-indigo-200 text-xs font-bold uppercase mb-2">Active Banners</div>
                <div className="text-4xl font-black">{banners.productBanners + banners.propertyBanners}</div>
              </div>
              <div className="w-px h-16 bg-white/20"></div>
              <div>
                <div className="text-indigo-200 text-xs font-bold uppercase mb-2">Expiring (7d)</div>
                <div className="text-4xl font-black text-red-300">{banners.expiring7Days}</div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <span className="text-[10px] font-bold text-indigo-100 uppercase block">Product Ad slots</span>
                <span className="text-xl font-black">{banners.productBanners}</span>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <span className="text-[10px] font-bold text-indigo-100 uppercase block">Property Ad slots</span>
                <span className="text-xl font-black">{banners.propertyBanners}</span>
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <FiAlertCircle className="text-red-500" /> Action Required
            </h3>
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${alert.severity === 'high' ? 'bg-red-50 border-red-100 text-red-700' :
                      alert.severity === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        'bg-blue-50 border-blue-100 text-blue-700'
                    }`}
                >
                  <div className="flex-shrink-0">
                    {alert.severity === 'high' ? <FiXCircle /> : alert.severity === 'medium' ? <FiClock /> : <FiAlertCircle />}
                  </div>
                  <span className="text-sm font-bold flex-1">{alert.message}</span>
                  <button className="px-3 py-1 bg-white rounded-lg text-xs font-black shadow-sm hover:translate-x-1 transition-all">RESOLVE</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 6: User Interactions */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900">Interaction Metrics</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-green-50 text-green-600 rounded-lg"><FiPhone /></span>
                <div className="leading-none">
                  <div className="text-[10px] font-black text-gray-400 uppercase">Calls</div>
                  <div className="font-black">{interactions.totalCalls}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FiMessageCircle /></span>
                <div className="leading-none">
                  <div className="text-[10px] font-black text-gray-400 uppercase">WhatsApp</div>
                  <div className="font-black">{interactions.totalWhatsApp}</div>
                </div>
              </div>
            </div>
          </div>

          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Most Popular Vendors</h4>
          <div className="space-y-4">
            {interactions.topVendors.map((vendor, vidx) => (
              <div key={vidx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-black text-primary-700">
                  {vidx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-black text-gray-800">{vendor.name}</div>
                  <div className="text-xs text-gray-500 font-bold flex gap-4 mt-1">
                    <span className="flex items-center gap-1"><FiPhone className="text-blue-500" /> {vendor.calls} calls</span>
                    <span className="flex items-center gap-1"><FiMessageCircle className="text-green-500" /> {vendor.wp} chat</span>
                  </div>
                </div>
                <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: `${100 - (vidx * 15)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Performance Charts */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-6">Top Product Categories</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.topCategories} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} />
                  <Bar dataKey="views" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-6">Top Property Locations</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.topLocations} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} />
                  <Bar dataKey="views" fill="#8B5CF6" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;


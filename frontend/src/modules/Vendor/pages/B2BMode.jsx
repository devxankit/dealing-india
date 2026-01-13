import { FiUsers, FiPackage, FiMessageCircle, FiTrendingUp } from "react-icons/fi";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const B2BMode = () => {
    const stats = [
        { label: "PartnerWholesalers", value: "12", icon: FiUsers, color: "blue" },
        { label: "Active Inquiries", value: "5", icon: FiMessageCircle, color: "green" },
        { label: "Saved Products", value: "24", icon: FiPackage, color: "purple" },
        { label: "B2B Savings", value: "₹15.4K", icon: FiTrendingUp, color: "orange" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Hero Section */}
            <div className="bg-primary-900 rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl lg:text-5xl font-black mb-4 leading-tight">
                        Connect with Trusted <br />Wholesalers Directly
                    </h1>
                    <p className="text-primary-100 text-lg mb-8 opacity-90">
                        Source high-quality products at bulk prices. Negotiate directly and build long-term B2B relationships.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/vendor/b2b/wholesalers" className="px-8 py-3 bg-white text-primary-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
                            Browse Products
                        </Link>
                        <Link to="/vendor/b2b/inquiries" className="px-8 py-3 bg-primary-800 text-white font-bold rounded-xl border border-primary-700 hover:bg-primary-700 transition-all">
                            View My Inquiries
                        </Link>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center mb-4`}>
                            <s.icon className="text-2xl" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-black text-gray-800 mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-800">Recent Inquiries</h3>
                        <Link to="/vendor/b2b/inquiries" className="text-sm font-bold text-primary-600 hover:underline">View All</Link>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
                        {[1, 2].map((_, i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <FiPackage className="text-slate-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">Premium Cotton Shirts Inquiry</h4>
                                        <p className="text-xs text-gray-500">To: Global Wholesale Hub • Yesterday</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Pending</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800">B2B Tools</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl text-white shadow-lg">
                            <h4 className="font-bold mb-1">Bulk Buy Calculator</h4>
                            <p className="text-xs text-indigo-100 mb-4 opacity-80">Calculate potential savings based on volume.</p>
                            <button className="w-full py-2 bg-white/20 rounded-lg font-bold text-sm hover:bg-white/30 transition-all">Try Now</button>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-primary-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                                    <FiTrendingUp className="text-primary-600" />
                                </div>
                                <span className="font-bold text-gray-700">Market Price Trends</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default B2BMode;

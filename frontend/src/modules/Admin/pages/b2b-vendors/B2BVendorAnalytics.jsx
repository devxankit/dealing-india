import { useState } from "react";
import { FiTrendingUp, FiUsers, FiPackage, FiDownload } from "react-icons/fi";
import { motion } from "framer-motion";
import TimePeriodFilter from "../../components/Analytics/TimePeriodFilter";

const AdminB2BVendorAnalytics = () => {
    const [period, setPeriod] = useState("this_month");

    const metrics = [
        { label: "Total B2B Vendors", value: "154", trend: "+12", icon: FiUsers, color: "blue" },
        { label: "B2B Volume", value: "₹4.2Cr", trend: "+8%", icon: FiTrendingUp, color: "green" },
        { label: "Product Listings", value: "1,245", trend: "+45", icon: FiPackage, color: "purple" },
        { label: "B2B Messages", value: "8.4K", trend: "+15%", icon: FiMessageCircle, color: "orange" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">B2B Vendor Analytics</h1>
                    <p className="text-gray-500">Monitor B2B ecosystem growth and performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <TimePeriodFilter activePeriod={period} onPeriodChange={setPeriod} />
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                        <FiDownload /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-${m.color}-50 text-${m.color}-600`}>
                                <m.icon className="text-xl" />
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{m.trend}</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{m.label}</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{m.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-80 flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6">B2B Vendor Onboarding Trend</h3>
                    <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                        <p className="text-sm text-gray-400">Onboarding Chart Placeholder</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-80 flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6">B2B Transaction Volume</h3>
                    <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                        <p className="text-sm text-gray-400">Transaction Chart Placeholder</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const FiMessageCircle = (props) => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);

export default AdminB2BVendorAnalytics;

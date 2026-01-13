import { useState } from "react";
import { FiTrendingUp, FiUsers, FiPackage, FiMessageCircle, FiDownload } from "react-icons/fi";
import { motion } from "framer-motion";
import TimePeriodFilter from "../../Admin/components/Analytics/TimePeriodFilter";

const WholesalerAnalytics = () => {
    const [period, setPeriod] = useState("this_month");

    const metrics = [
        { label: "Total Reach", value: "45.2K", trend: "+12%", icon: FiTrendingUp, color: "blue" },
        { label: "Vendor Inquiries", value: "842", trend: "+5%", icon: FiMessageCircle, color: "green" },
        { label: "Active Vendors", value: "124", trend: "+2%", icon: FiUsers, color: "purple" },
        { label: "Listing Views", value: "12.5K", trend: "+8%", icon: FiPackage, color: "orange" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Analytics & Reports</h1>
                    <p className="text-gray-500">Track your B2B performance and vendor engagement.</p>
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

            {/* Chart Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-80 flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6">Inquiry Trends</h3>
                    <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                        <p className="text-sm text-gray-400">Inquiry Volume Chart Placeholder</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-80 flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6">Top Performing Categories</h3>
                    <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                        <p className="text-sm text-gray-400">Category Distribution Chart Placeholder</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default WholesalerAnalytics;

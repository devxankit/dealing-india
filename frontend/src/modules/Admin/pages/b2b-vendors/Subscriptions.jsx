import { useState } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiXCircle, FiTrendingUp, FiSettings, FiActivity } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";

const Subscriptions = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const mockSubscriptions = [
        {
            _id: '1',
            vendorName: 'Global Wholesale Hub',
            plan: 'Platinum',
            status: 'Active',
            amount: '₹4,999',
            billingCycle: 'Monthly',
            expiryDate: '2024-12-15',
            autoRenew: true
        },
        {
            _id: '2',
            vendorName: 'Urban Textiles',
            plan: 'Gold',
            status: 'Expired',
            amount: '₹2,499',
            billingCycle: 'Quarterly',
            expiryDate: '2023-11-20',
            autoRenew: false
        },
        {
            _id: '3',
            vendorName: 'ElectroBulk Co',
            plan: 'Platinum',
            status: 'Active',
            amount: '₹4,999',
            billingCycle: 'Yearly',
            expiryDate: '2025-01-10',
            autoRenew: true
        },
    ];

    const stats = [
        { label: "Active Subscriptions", value: "142", icon: FiCheckCircle, color: "text-green-600", bg: "bg-green-100" },
        { label: "Monthly Revenue", value: "₹2,45,000", icon: FiTrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Expiring Soon", value: "12", icon: FiActivity, color: "text-orange-600", bg: "bg-orange-100" },
    ];

    const columns = [
        {
            key: "vendorName",
            label: "Vendor",
            render: (val) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{val}</span>
                    <span className="text-[10px] text-gray-400 font-medium">B2B Vendor</span>
                </div>
            )
        },
        {
            key: "plan",
            label: "Plan",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${val === 'Platinum' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {val}
                </span>
            )
        },
        {
            key: "billingCycle",
            label: "Cycle"
        },
        {
            key: "amount",
            label: "Amount",
            render: (val) => <span className="font-bold text-gray-700">{val}</span>
        },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${val === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {val === 'Active' ? <FiCheckCircle /> : <FiXCircle />}
                    {val}
                </span>
            )
        },
        { key: "expiryDate", label: "Expiry" },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><FiEdit2 /></button>
                    <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><FiSettings /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Subscription Management</h1>
                    <p className="text-gray-500 text-sm">Monitor and manage B2B vendor subscription plans and cycles.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search subscriptions..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5"
                    >
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                            <stat.icon />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-6 mb-8 border-b border-gray-50">
                    {["all", "active", "expired", "pending"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                <DataTable
                    data={mockSubscriptions}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default Subscriptions;

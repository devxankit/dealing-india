import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    FiPackage,
    FiMessageCircle,
    FiTrendingUp,
    FiArrowRight,
    FiBriefcase,
    FiUsers
} from "react-icons/fi";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import TimePeriodFilter from "../../Admin/components/Analytics/TimePeriodFilter";
import { getB2BVendorDashboardData } from "../services/b2bDashboardService";
import toast from "react-hot-toast";

const B2BVendorDashboard = () => {
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        metrics: {
            totalProducts: 0,
            totalInquiries: 0,
            activeConversations: 0,
        },
        recentInquiries: [],
        topProducts: []
    });

    useEffect(() => {
        loadDashboardData();
    }, [period]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const response = await getB2BVendorDashboardData(period);

            // Handle different response structures
            let dashboardData = null;
            if (response?.data?.success && response?.data?.data) {
                dashboardData = response.data.data;
            } else if (response?.success && response?.data) {
                dashboardData = response.data;
            } else if (response?.data) {
                dashboardData = response.data;
            }

            if (dashboardData) {
                setData({
                    metrics: {
                        totalProducts: dashboardData.metrics?.totalProducts || 0,
                        totalInquiries: dashboardData.metrics?.totalInquiries || 0,
                        activeConversations: dashboardData.metrics?.activeConversations || 0,
                    },
                    recentInquiries: dashboardData.recentInquiries || [],
                    topProducts: dashboardData.topProducts || []
                });
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            toast.error(error?.response?.data?.message || 'Failed to load dashboard data');
            // Set empty data on error
            setData({
                metrics: {
                    totalProducts: 0,
                    totalInquiries: 0,
                    activeConversations: 0,
                },
                recentInquiries: [],
                topProducts: []
            });
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            icon: FiPackage,
            label: "Total Products",
            value: data.metrics.totalProducts,
            color: "bg-blue-500",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            link: "/b2b-vendor/products",
        },
        {
            icon: FiMessageCircle,
            label: "Buyer Inquiries",
            value: data.metrics.totalInquiries,
            color: "bg-green-500",
            bgColor: "bg-green-50",
            textColor: "text-green-700",
            link: "/b2b-vendor/messages",
        },
        {
            icon: FiTrendingUp,
            label: "Active Chats",
            value: data.metrics.activeConversations,
            color: "bg-orange-500",
            bgColor: "bg-orange-50",
            textColor: "text-orange-700",
            link: "/b2b-vendor/messages",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">B2B Vendor Dashboard</h1>
                    <p className="text-sm sm:text-base text-gray-600">
                        Welcome, {vendor?.name}! Manage your B2B listings and retailer relations.
                    </p>
                </div>
                <TimePeriodFilter selectedPeriod={period} onPeriodChange={setPeriod} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => navigate(stat.link)}
                        className={`${stat.bgColor} rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all border border-transparent hover:border-${stat.textColor.split('-')[1]}-200`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} p-3 rounded-lg shadow-md`}>
                                <stat.icon className="text-white text-xl" />
                            </div>
                            <FiArrowRight className={`${stat.textColor} text-lg`} />
                        </div>
                        <h3 className={`${stat.textColor} text-sm font-bold uppercase tracking-wider mb-1`}>{stat.label}</h3>
                        <p className={`${stat.textColor} text-3xl font-extrabold`}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Recent Buyer Inquiries</h2>
                            <button onClick={() => navigate("/b2b-vendor/messages")} className="text-sm text-primary-600 font-bold hover:underline">View All</button>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Loading inquiries...</div>
                            ) : data.recentInquiries.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No recent inquiries</div>
                            ) : (
                                data.recentInquiries.map((inq) => (
                                    <div key={inq.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200" onClick={() => navigate("/b2b-vendor/messages")}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                                                <FiUsers className="text-primary-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{inq.vendor}</p>
                                                <p className="text-xs text-gray-500">{inq.product}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 mb-1">{new Date(inq.date).toLocaleDateString()}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${inq.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {inq.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Top Listed Products</h2>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-4 text-gray-500">Loading products...</div>
                            ) : data.topProducts.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">No products with inquiries yet</div>
                            ) : (
                                data.topProducts.map((prod) => (
                                    <div key={prod.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="font-bold text-gray-800 mb-1">{prod.name}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500">{prod.inquiries} Inquiries</span>
                                            <span className="text-primary-600 font-bold">Visibility: {prod.visibility}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => navigate("/b2b-vendor/products")} className="w-full mt-6 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-200">
                            Manage Catalog
                        </button>
                    </div>


                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorDashboard;

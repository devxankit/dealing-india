import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    FiPackage,
    FiMessageCircle,
    FiTrendingUp,
    FiArrowRight,
    FiBriefcase,
    FiUsers,
    FiHome
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

    const isPropertyBusiness =
        vendor?.businessType?.toLowerCase().includes('property') ||
        vendor?.businessType?.toLowerCase().includes('real estate') ||
        ['Property Broker', 'Property Developer'].includes(vendor?.businessType);

    const statCards = [
        {
            icon: FiPackage,
            label: "Total Products",
            value: data.metrics.totalProducts || 0,
            color: "bg-blue-500",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            link: "/b2b-vendor/products",
        },
        {
            icon: FiHome,
            label: "Total Properties",
            value: data.metrics.totalProperties || 0,
            color: "bg-purple-500",
            bgColor: "bg-purple-50",
            textColor: "text-purple-700",
            link: "/b2b-vendor/properties",
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
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tight mb-1">
                        {vendor?.businessType} Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 font-medium">
                        Welcome back, <span className="text-slate-900 font-bold">{vendor?.name}</span>. Your {vendor?.businessType} business overview.
                    </p>
                </div>
                <TimePeriodFilter selectedPeriod={period} onPeriodChange={setPeriod} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={index}
                            whileHover={{ y: -5 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => navigate(stat.link)}
                            className={`${stat.bgColor} rounded-[2rem] p-8 cursor-pointer hover:shadow-xl transition-all border border-transparent shadow-sm`}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className={`${stat.color} w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center`}>
                                    <Icon className="text-white text-2xl" />
                                </div>
                                <div className={`${stat.bgColor.replace('50', '200')} p-2 rounded-full`}>
                                    <FiArrowRight className={`${stat.textColor} text-xl`} />
                                </div>
                            </div>
                            <h3 className={`${stat.textColor} text-xs font-black uppercase tracking-widest mb-2`}>{stat.label}</h3>
                            <p className={`${stat.textColor} text-4xl font-black`}>{stat.value}</p>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center py-20 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
                        <div className="relative z-10">
                            <FiUsers className="text-slate-200 text-6xl mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Grow Your {vendor?.businessType} Network</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto">
                                Buyers and agents will contact you directly via WhatsApp or Phone for business inquiries. Ensure your profile is updated!
                            </p>
                            <button
                                onClick={() => navigate("/b2b-vendor/profile")}
                                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                            >
                                Update Profile
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/30 rounded-full blur-3xl -mr-16 -mt-16" />
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-widest">
                            {isPropertyBusiness ? "Top Properties" : "Top Listed Products"}
                        </h2>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500 font-medium">Loading listings...</div>
                            ) : data.topProducts?.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 font-medium">No performance data yet</div>
                            ) : (
                                (isPropertyBusiness ? (data.topProperties || []) : data.topProducts).map((item) => (
                                    <div key={item.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary-200 transition-all cursor-pointer">
                                        <p className="font-black text-slate-800 mb-1">{item.name}</p>
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            <span>{item.inquiries || 0} Inquiries</span>
                                            <span className="text-primary-600">Active</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => navigate(isPropertyBusiness ? "/b2b-vendor/properties" : "/b2b-vendor/products")}
                            className="w-full mt-8 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                        >
                            {isPropertyBusiness ? "Manage Portfolio" : "Manage Catalog"}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorDashboard;

import { useState, useEffect } from "react";
import { FiTrendingUp, FiUsers, FiPackage, FiMessageCircle, FiDownload } from "react-icons/fi";
import { motion } from "framer-motion";
import TimePeriodFilter from "../../Admin/components/Analytics/TimePeriodFilter";
import InquiryTrendsChart from "../components/Analytics/InquiryTrendsChart";
import CategoryDistributionChart from "../components/Analytics/CategoryDistributionChart";
import { getB2BVendorDashboardData } from "../services/b2bDashboardService";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import toast from "react-hot-toast";

const B2BVendorAnalytics = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [period, setPeriod] = useState("month");
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState([
        { label: "Total Reach", value: "0", trend: "0%", icon: FiTrendingUp, color: "blue" },
        { label: "Buyer Inquiries", value: "0", trend: "0%", icon: FiMessageCircle, color: "green" },
        { label: "Active Buyers", value: "0", trend: "0%", icon: FiUsers, color: "purple" },
        { label: "Total Products", value: "0", trend: "0%", icon: FiPackage, color: "orange" },
    ]);
    const [chartData, setChartData] = useState({
        inquiryTrends: [],
        categoryDistribution: []
    });

    useEffect(() => {
        if (vendor) {
            fetchAnalyticsData();
        }
    }, [vendor, period]);

    const fetchAnalyticsData = async () => {
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
                const { metrics: dataMetrics, charts } = dashboardData;
                
                // Active Buyers = Active Conversations (conversations with messages = unique buyers)
                const activeBuyersCount = dataMetrics?.activeConversations || 0;

                // Format numbers
                const formatNumber = (num) => {
                    if (num >= 1000) {
                        return (num / 1000).toFixed(1) + 'K';
                    }
                    return num.toString();
                };

                setMetrics([
                    {
                        label: "Total Reach",
                        value: formatNumber(dataMetrics?.totalInquiries || 0),
                        trend: "+0%", // Can be calculated based on period comparison
                        icon: FiTrendingUp,
                        color: "blue"
                    },
                    {
                        label: "Buyer Inquiries",
                        value: (dataMetrics?.totalInquiries || 0).toString(),
                        trend: "+0%",
                        icon: FiMessageCircle,
                        color: "green"
                    },
                    {
                        label: "Active Buyers",
                        value: activeBuyersCount.toString(),
                        trend: "+0%",
                        icon: FiUsers,
                        color: "purple"
                    },
                    {
                        label: "Total Products",
                        value: (dataMetrics?.totalProducts || 0).toString(),
                        trend: "+0%",
                        icon: FiPackage,
                        color: "orange"
                    },
                ]);

                // Set chart data
                setChartData({
                    inquiryTrends: charts?.inquiryTrends || [],
                    categoryDistribution: charts?.categoryDistribution || []
                });
            }
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Analytics & Reports</h1>
                    <p className="text-gray-500">Track your B2B performance and buyer engagement.</p>
                </div>
                <div className="flex items-center gap-3">
                    <TimePeriodFilter activePeriod={period} onPeriodChange={setPeriod} />
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                        <FiDownload /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="animate-pulse">
                                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    metrics.map((m, i) => (
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
                    ))
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InquiryTrendsChart data={chartData.inquiryTrends} period={period} />
                <CategoryDistributionChart data={chartData.categoryDistribution} />
            </div>
        </motion.div>
    );
};

export default B2BVendorAnalytics;

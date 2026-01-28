import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiClock, FiPackage, FiTrendingUp, FiSearch, FiCalendar, FiX } from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import DataTable from "../../components/DataTable";
import ExportButton from "../../components/ExportButton";
import StatCard from "../../../../shared/components/StatCard";
import { useOrderData } from "../../hooks/useOrderData";
import { getOrderColumns } from "../../utils/orderColumns";
import { formatPrice } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import { useMemo } from "react";

const Awaiting = () => {
    const navigate = useNavigate();
    const {
        orders,
        loading,
        searchQuery,
        setSearchQuery,
        dateRange,
        setDateRange,
        stats,
        calculateFinalTotal
    } = useOrderData("awaiting");

    const handlers = useMemo(() => ({
        handleOrderDetails: (id) => navigate(`/admin/orders/${id}`),
        handleGenerateInvoice: (order) => navigate(`/admin/orders/${order._id || order.id}/invoice`),
        handleOrderTracking: (id) => navigate(`/admin/orders/order-tracking?orderId=${id}`),
        handleDeleteOrder: (id) => {
            toast.success("Delete functionality would be triggered here");
        },
        calculateFinalTotal
    }), [navigate, calculateFinalTotal]);

    const columns = useMemo(() => getOrderColumns(handlers), [handlers]);

    const statCards = [
        {
            icon: FiClock,
            label: "Awaiting Orders",
            value: stats.count,
            color: "bg-blue-500",
            bgColor: "bg-gradient-to-br from-yellow-400 to-yellow-600",
            textColor: "text-blue-900",
        },
        {
            icon: FiPackage,
            label: "Total Items",
            value: stats.itemsCount,
            color: "bg-blue-500",
            bgColor: "bg-gradient-to-br from-green-400 to-green-600",
            textColor: "text-blue-900",
        },
        {
            icon: IndianRupee,
            label: "Estimated Revenue",
            value: formatPrice(stats.revenue || 0),
            color: "bg-blue-500",
            bgColor: "bg-gradient-to-br from-purple-400 to-purple-600",
            textColor: "text-blue-900",
        },
        {
            icon: FiTrendingUp,
            label: "Average Order Value",
            value: formatPrice(stats.aov || 0),
            color: "bg-blue-500",
            bgColor: "bg-gradient-to-br from-orange-400 to-orange-600",
            textColor: "text-blue-900",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Awaiting Orders</h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage orders waiting for confirmation</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="relative flex-1 w-full sm:min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search orders..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                className="w-full sm:w-auto pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />
                        </div>
                        {(dateRange.startDate || dateRange.endDate) && (
                            <button
                                onClick={() => setDateRange({ startDate: "", endDate: "" })}
                                className="p-2 text-gray-500 hover:text-gray-700"
                            >
                                <FiX />
                            </button>
                        )}
                    </div>

                    <ExportButton
                        data={orders}
                        filename="awaiting-orders"
                        headers={[
                            { label: "Order ID", accessor: "orderCode" },
                            { label: "Customer", accessor: (row) => row.customerSnapshot?.name || "Guest" },
                            { label: "Total", accessor: (row) => calculateFinalTotal(row) },
                            { label: "Date", accessor: (row) => new Date(row.createdAt).toLocaleDateString() }
                        ]}
                    />
                </div>
            </div>

            <DataTable
                data={orders}
                columns={columns}
                loading={loading}
                pagination={true}
                itemsPerPage={10}
            />
        </motion.div>
    );
};

export default Awaiting;

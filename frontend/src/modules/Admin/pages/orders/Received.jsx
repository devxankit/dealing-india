import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCheckCircle, FiPackage, FiTrendingUp, FiSearch, FiCalendar, FiX } from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import DataTable from "../../components/DataTable";
import ExportButton from "../../components/ExportButton";
import StatCard from "../../../../shared/components/StatCard";
import { useOrderData } from "../../hooks/useOrderData";
import { getOrderColumns } from "../../utils/orderColumns";
import { formatPrice } from "../../../../shared/utils/helpers";

const Received = () => {
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
    } = useOrderData("received");

    const handlers = {
        handleOrderDetails: (id) => navigate(`/admin/orders/${id}`),
        handleGenerateInvoice: (order) => navigate(`/admin/orders/${order._id || order.id}/invoice`),
        handleOrderTracking: (id) => navigate(`/admin/orders/order-tracking?orderId=${id}`),
        handleDeleteOrder: (id) => { },
        calculateFinalTotal
    };

    const columns = getOrderColumns(handlers);

    const statCards = [
        {
            icon: FiCheckCircle,
            label: "Received Orders",
            value: stats.count,
            color: "bg-blue-500",
            bgColor: "bg-gradient-to-br from-blue-400 to-blue-600",
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
            label: "Total Revenue",
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Received Orders</h1>
                    <p className="text-sm sm:text-base text-gray-600">Orders that have been successfully received</p>
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
                            placeholder="Search received orders..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <FiCalendar className="text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>

                    <ExportButton
                        data={orders}
                        filename="received-orders"
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

export default Received;

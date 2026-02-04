import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiPackage,
  FiTruck,
  FiRotateCw,
  FiShoppingBag,
  FiCalendar,
  FiX,
  FiTrendingUp,
} from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import DataTable from "../../components/DataTable";
import ExportButton from "../../components/ExportButton";
import StatCard from "../../../../shared/components/StatCard";
import { useOrderData } from "../../hooks/useOrderData";
import { getOrderColumns } from "../../utils/orderColumns";
import OrderAnalyticsCharts from "./components/OrderAnalyticsCharts";
import { formatPrice } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import OrderDetailsModal from "../../components/OrderDetailsModal";

const AllOrders = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    orders,
    loading,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    stats,
    calculateFinalTotal,
  } = useOrderData("all");

  const handlers = {
    handleOrderDetails: (id) => {
      const order = orders.find(o => (o._id === id || o.id === id || o.orderCode === id));
      if (order) {
        setSelectedOrder(order);
        setIsModalOpen(true);
      } else {
        // Fallback to navigation if order not found in current list
        navigate(`/admin/orders/${id}`);
      }
    },
    handleViewPage: (id) => navigate(`/admin/orders/${id}`),
    handleGenerateInvoice: (order) => navigate(`/admin/orders/${order._id || order.id}/invoice`),
    handleOrderTracking: (id) => navigate(`/admin/orders/order-tracking?orderId=${id}`),
    handleDeleteOrder: (id) => {
      toast.success("Delete functionality would be triggered here");
    },
    calculateFinalTotal
  };

  const columns = getOrderColumns(handlers);

  const statCards = [
    {
      label: "Total Orders",
      value: stats.count,
      icon: FiShoppingBag,
      color: "bg-blue-500",
      bgColor: "bg-gradient-to-br from-blue-400 to-blue-600",
      textColor: "text-blue-900",
    },
    {
      label: "Total Items Sold",
      value: stats.itemsCount,
      icon: FiPackage,
      color: "bg-blue-500",
      bgColor: "bg-gradient-to-br from-emerald-400 to-emerald-600",
      textColor: "text-blue-900",
    },
    {
      label: "Total Revenue",
      value: formatPrice(stats.revenue),
      icon: IndianRupee,
      color: "bg-blue-500",
      bgColor: "bg-gradient-to-br from-violet-400 to-violet-600",
      textColor: "text-blue-900",
    },
    {
      label: "Average Order Value",
      value: formatPrice(stats.aov),
      icon: FiTrendingUp,
      color: "bg-blue-500",
      bgColor: "bg-gradient-to-br from-orange-400 to-orange-600",
      textColor: "text-blue-900",
    },
  ];

  const quickLinks = [
    { title: "Awaiting", status: "awaiting", icon: FiClock, color: "bg-yellow-500", path: "/admin/orders/awaiting" },
    { title: "Received", status: "received", icon: FiCheckCircle, color: "bg-blue-500", path: "/admin/orders/received" },
    { title: "Processed", status: "processed", icon: FiPackage, color: "bg-indigo-500", path: "/admin/orders/processed" },
    { title: "Shipped", status: "shipped", icon: FiTruck, color: "bg-blue-600", path: "/admin/orders/shipped" },
    { title: "Delivered", status: "delivered", icon: FiCheckCircle, color: "bg-green-500", path: "/admin/orders/delivered" },
    { title: "Returned", status: "returned", icon: FiRotateCw, color: "bg-orange-500", path: "/admin/orders/returned" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Order Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Overview of all customer transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map((link, index) => (
          <motion.div
            key={link.title}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(link.path)}
            className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col items-center text-center transition-all"
          >
            <div className={`${link.color} p-2 rounded-lg mb-2`}>
              <link.icon className="text-white text-lg" />
            </div>
            <span className="text-xs font-medium text-gray-700">{link.title}</span>
          </motion.div>
        ))}
      </div>

      <OrderAnalyticsCharts />

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all orders..."
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
            filename="all-orders"
            headers={[
              { label: "Order ID", accessor: (row) => row.orderCode || row.id || row._id },
              { label: "Customer", accessor: (row) => row.customerSnapshot?.name || row.customerId?.name || "Guest" },
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

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
      />
    </motion.div>
  );
};

export default AllOrders;

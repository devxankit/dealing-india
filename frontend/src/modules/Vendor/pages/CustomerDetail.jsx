import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiShoppingBag,
  FiDollarSign,
  FiClock,
  FiPackage,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Badge from "../../../shared/components/Badge";
import DataTable from "../../Admin/components/DataTable";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import toast from "react-hot-toast";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const { getVendorOrders } = useOrderStore();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;

    // Get all vendor orders
    const allOrders = getVendorOrders(vendorId);

    // Find customer from orders
    const customerOrders = allOrders.filter((order) => {
      const customerId = order.userId || `guest-${order.id}`;
      return customerId === id;
    });

    if (customerOrders.length === 0) {
      toast.error("Customer not found");
      navigate(-1);
      return;
    }

    // Extract customer info from first order
    const firstOrder = customerOrders[0];
    const customerData = {
      id: id,
      name: firstOrder.customer?.name || "Guest Customer",
      email: firstOrder.customer?.email || "",
      phone: firstOrder.customer?.phone || "",
      orders: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, order) => {
        const vendorItem = order.vendorItems?.find(
          (vi) => vi.vendorId === vendorId
        );
        return sum + (vendorItem?.vendorEarnings || 0);
      }, 0),
      lastOrderDate: customerOrders[0].date,
    };

    setCustomer(customerData);
    setOrders(customerOrders);
  }, [id, vendorId, getVendorOrders, navigate]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      delivered: { variant: "delivered", label: "Delivered" },
      shipped: { variant: "shipped", label: "Shipped" },
      processing: { variant: "pending", label: "Processing" },
      pending: { variant: "pending", label: "Pending" },
      cancelled: { variant: "cancelled", label: "Cancelled" },
    };
    const config = statusConfig[status] || {
      variant: "pending",
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const orderColumns = [
    {
      key: "id",
      label: "Order ID",
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-800">{value}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (value, row) => {
        const vendorItem = row.vendorItems?.find(
          (vi) => vi.vendorId === vendorId
        );
        return (
          <span className="text-sm text-gray-600">
            {vendorItem?.items?.length || 0} item(s)
          </span>
        );
      },
    },
    {
      key: "total",
      label: "Amount",
      sortable: true,
      render: (value, row) => {
        const vendorItem = row.vendorItems?.find(
          (vi) => vi.vendorId === vendorId
        );
        return (
          <span className="font-semibold text-gray-800">
            {formatPrice(vendorItem?.vendorEarnings || 0)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => getStatusBadge(value),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => navigate(`/vendor/orders/${row.id}`)}
          className="text-primary-600 hover:text-primary-700 font-medium text-sm">
          View Details
        </button>
      ),
    },
  ];

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: FiShoppingBag,
      label: "Total Orders",
      value: customer.orders,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      icon: FiDollarSign,
      label: "Total Spent",
      value: formatPrice(customer.totalSpent),
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      icon: FiClock,
      label: "Last Order",
      value: customer.lastOrderDate
        ? new Date(customer.lastOrderDate).toLocaleDateString()
        : "N/A",
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft className="text-xl text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {customer.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Customer Details</p>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
            <FiPackage className="text-primary-600 text-2xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {customer.name}
            </h2>
            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiMail className="text-gray-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiPhone className="text-gray-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white text-xl" />
              </div>
            </div>
            <h3 className={`${stat.textColor} text-sm font-medium mb-1`}>
              {stat.label}
            </h3>
            <p className={`${stat.textColor} text-2xl font-bold`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Order History</h2>
        </div>
        {orders.length > 0 ? (
          <DataTable
            data={orders}
            columns={orderColumns}
            pagination={true}
            itemsPerPage={10}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CustomerDetail;

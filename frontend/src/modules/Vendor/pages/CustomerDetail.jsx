import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiShoppingBag,
  FiClock,
  FiPackage,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Badge from "../../../shared/components/Badge";
import DataTable from "../../Admin/components/DataTable";
import { formatPrice } from "../../../shared/utils/helpers";
import { IndianRupee } from "lucide-react";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorCustomerById } from "../services/customerService";
import toast from "react-hot-toast";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const vendorId = vendor?.id;

  useEffect(() => {
    const fetchCustomerDetail = async () => {
      if (!vendorId || !id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getVendorCustomerById(id);

        console.log('Customer Detail Response:', response);

        if (response.success && response.data) {
          setCustomer(response.data.customer);
          setOrders(response.data.orders || []);
        } else if (response.customer) {
          // Handle direct response structure
          setCustomer(response.customer);
          setOrders(response.orders || []);
        } else {
          toast.error("Customer not found");
          navigate("/vendor/customers");
        }
      } catch (error) {
        console.error("Error fetching customer detail:", error);
        toast.error("Failed to load customer details");
        navigate("/vendor/customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetail();
  }, [id, vendorId, navigate]);

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
          (vi) => vi.vendorId?.toString() === vendorId?.toString()
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
          (vi) => vi.vendorId?.toString() === vendorId?.toString()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Customer not found</p>
          <button
            onClick={() => navigate("/vendor/customers")}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Back to Customers
          </button>
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
      icon: IndianRupee,
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

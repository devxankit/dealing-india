import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiMapPin,
  FiTruck,
  FiPackage,
  FiCheckCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Badge from "../../../../shared/components/Badge";
import { getAdminOrders } from "../../../../shared/services/orderService";
import toast from "react-hot-toast";

const OrderTracking = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await getAdminOrders({ 
          page: 1, 
          limit: 1000 // Get all orders for tracking
        });
        
        console.log('Order Tracking Response:', response); // Debug log
        
        // Handle different response structures (API interceptor might unwrap)
        let ordersData = [];
        if (response?.success && response?.data) {
          // Response structure: { success: true, data: { orders: [], total: 0, ... } }
          ordersData = response.data.orders || [];
        } else if (Array.isArray(response?.data)) {
          // If data is directly an array
          ordersData = response.data;
        } else if (Array.isArray(response)) {
          // If response is directly an array
          ordersData = response;
        } else if (response?.orders) {
          // If orders is at root level
          ordersData = response.orders;
        }
        
        console.log('Orders Data:', ordersData); // Debug log
        setOrders(ordersData);
        
        if (ordersData.length === 0) {
          console.warn('No orders found in response');
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load orders");
        setOrders([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    const orderCode = order.orderCode || order.id || '';
    const customerName = order.customerSnapshot?.name || order.customerId?.name || '';
    const customerEmail = order.customerSnapshot?.email || order.customerId?.email || '';
    
    return (
      orderCode.toString().toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower) ||
      customerEmail.toLowerCase().includes(searchLower)
    );
  });

  const getTrackingSteps = (order) => {
    const status = order?.status?.toLowerCase() || 'pending';
    const statusHistory = order?.statusHistory || [];
    
    const steps = [
      { 
        label: "Order Placed", 
        status: "completed", 
        icon: FiCheckCircle,
        timestamp: statusHistory.find(h => h.status === 'pending')?.timestamp || order?.createdAt
      },
      {
        label: "Processing",
        status: ['processing', 'ready_to_ship', 'dispatched', 'shipped', 'shipped_seller', 'delivered'].includes(status)
          ? "completed"
          : "pending",
        icon: FiPackage,
        timestamp: statusHistory.find(h => h.status === 'processing')?.timestamp
      },
      {
        label: "Shipped",
        status: ['shipped', 'shipped_seller', 'delivered'].includes(status)
          ? "completed"
          : "pending",
        icon: FiTruck,
        timestamp: statusHistory.find(h => ['shipped', 'shipped_seller', 'dispatched'].includes(h.status))?.timestamp
      },
      {
        label: "Delivered",
        status: status === "delivered" ? "completed" : "pending",
        icon: FiMapPin,
        timestamp: statusHistory.find(h => h.status === 'delivered')?.timestamp || order?.tracking?.deliveredAt
      },
    ];
    return steps;
  };

  const columns = [
    {
      key: "orderCode",
      label: "Order ID",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold">{value || row.id || row._id}</span>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      render: (value, row) => {
        const customer = row.customerSnapshot || row.customerId || value || {};
        return (
          <div>
            <p className="font-medium text-gray-800">{customer.name || 'Guest'}</p>
            <p className="text-xs text-gray-500">{customer.email || ''}</p>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <Badge status={value}>{value}</Badge>,
    },
    {
      key: "createdAt",
      label: "Order Date",
      sortable: true,
      render: (value, row) => new Date(value || row.orderDate || row.createdAt).toLocaleString(),
    },
    {
      key: "tracking",
      label: "Tracking",
      sortable: false,
      render: (value, row) => (
        <div className="text-xs">
          {row.tracking?.trackingNumber ? (
            <span className="text-primary-600 font-semibold">{row.tracking.trackingNumber}</span>
          ) : (
            <span className="text-gray-400">No tracking</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => setSelectedOrder(row)}
          className="px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold">
          Track
        </button>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Order Tracking
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track order status and delivery progress
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or customer name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading orders...</p>
              </div>
            ) : (
              <DataTable
                data={filteredOrders}
                columns={columns}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </div>
        </div>

        {selectedOrder && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Tracking Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order ID</p>
                <p className="font-semibold text-gray-800">
                  {selectedOrder.orderCode || selectedOrder.id}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="font-semibold text-gray-800">
                  {selectedOrder.customerSnapshot?.name || selectedOrder.customerId?.name || 'Guest'}
                </p>
                {selectedOrder.tracking?.trackingNumber && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
                    <p className="font-semibold text-primary-600">
                      {selectedOrder.tracking.trackingNumber}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {getTrackingSteps(selectedOrder).map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          step.status === "completed"
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                        <Icon className="text-sm" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            step.status === "completed"
                              ? "text-gray-800"
                              : "text-gray-400"
                          }`}>
                          {step.label}
                        </p>
                        {step.status === "completed" && step.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(step.timestamp).toLocaleString()}
                          </p>
                        )}
                        {step.status === "pending" && (
                          <p className="text-xs text-gray-400 mt-1">
                            Pending
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderTracking;

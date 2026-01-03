import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiPackage, FiTruck, FiCheckCircle, FiClock, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Badge from '../../../../shared/components/Badge';
import { formatPrice } from '../../../../shared/utils/helpers';
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { getVendorOrders } from '../../../../shared/services/orderService';
import toast from 'react-hot-toast';

const OrderTracking = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [vendorOrders, setVendorOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const vendorId = vendor?.id;

  // Fetch vendor orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      if (!vendorId) {
        setVendorOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getVendorOrders({
          page: 1,
          limit: 1000, // Get all orders for tracking
        });
        if (response.success && response.data) {
          setVendorOrders(response.data.orders || []);
        }
      } catch (error) {
        console.error('Error fetching vendor orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [vendorId]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return vendorOrders;
    const searchLower = searchQuery.toLowerCase();
    return vendorOrders.filter((order) =>
      (order.orderCode || order.id || '').toString().toLowerCase().includes(searchLower) ||
      (order.tracking?.trackingNumber || order.trackingNumber || '').toLowerCase().includes(searchLower)
    );
  }, [vendorOrders, searchQuery]);

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <FiClock className="text-yellow-600" />;
      case 'processing':
        return <FiPackage className="text-indigo-600" />;
      case 'shipped':
        return <FiTruck className="text-cyan-600" />;
      case 'delivered':
        return <FiCheckCircle className="text-green-600" />;
      case 'cancelled':
      case 'canceled':
        return <FiX className="text-red-600" />;
      default:
        return <FiClock className="text-gray-600" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-indigo-100 text-indigo-800';
      case 'shipped':
        return 'bg-cyan-100 text-cyan-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get vendor order data
  const getVendorOrderData = (order) => {
    if (order.vendorItems && Array.isArray(order.vendorItems) && order.vendorItems.length > 0) {
      const vendorItem = order.vendorItems[0]; // Vendor orders already filtered
      return {
        itemCount: vendorItem.items?.length || 0,
        subtotal: vendorItem.subtotal || 0,
      };
    }
    // Fallback
    const itemCount = order.items?.length || 0;
    const subtotal = order.total || 0;
    return {
      itemCount,
      subtotal,
    };
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to track orders</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Order Tracking
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track the status of your orders
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or Tracking Number..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const vendorData = getVendorOrderData(order);
            const orderId = order._id || order.id || order.orderCode;
            return (
              <motion.div
                key={orderId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/vendor/orders/${orderId}`)}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{order.orderCode || order.id}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(order.orderDate || order.date || order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Items: </span>
                        <span className="font-semibold text-gray-800">
                          {vendorData.itemCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount: </span>
                        <span className="font-semibold text-gray-800">
                          {formatPrice(vendorData.subtotal)}
                        </span>
                      </div>
                      {(order.tracking?.trackingNumber || order.trackingNumber) && (
                        <div>
                          <span className="text-gray-600">Tracking: </span>
                          <span className="font-semibold text-gray-800">
                            {order.tracking?.trackingNumber || order.trackingNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <Badge
                      status={order.status}
                    >
                      {order.status?.toUpperCase() || 'N/A'}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vendor/orders/${orderId}`);
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold">
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <FiMapPin className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No orders found</p>
            <p className="text-sm text-gray-400">
              {searchQuery
                ? 'Try a different search term'
                : 'Orders containing your products will appear here'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderTracking;


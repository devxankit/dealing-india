import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock, FiEye, FiRotateCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import Badge from '../../../shared/components/Badge';
import { useOrderStore } from '../../../shared/store/orderStore';
import { useAuthStore } from '../../../shared/store/authStore';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const Orders = () => {
  const { getAllOrders } = useOrderStore();
  const { user } = useAuthStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [selectedStatus, setSelectedStatus] = useState('all');

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Get orders from store
  const allOrders = getAllOrders(user?.id || null);

  const filteredOrders = useMemo(() => {
    if (selectedStatus === 'all') return allOrders;
    return allOrders.filter((order) => order.status === selectedStatus);
  }, [selectedStatus, allOrders]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiClock className="text-orange-500" />;
      case 'processing':
        return <FiPackage className="text-blue-500" />;
      case 'shipped':
        return <FiTruck className="text-purple-500" />;
      case 'delivered':
        return <FiCheckCircle className="text-green-500" />;
      case 'cancelled':
        return <FiXCircle className="text-red-500" />;
      default:
        return <FiClock className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      processing: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'error',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  const getTrackingSteps = (status) => {
    const steps = [
      { label: 'Order Placed', completed: true },
      { label: 'Processing', completed: ['processing', 'shipped', 'delivered'].includes(status) },
      { label: 'Shipped', completed: ['shipped', 'delivered'].includes(status) },
      { label: 'Delivered', completed: status === 'delivered' },
    ];
    return steps;
  };

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
              <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">My Orders</h1>

                {/* Status Filter */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                        selectedStatus === option.value
                          ? 'gradient-green text-white shadow-glow-green'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                      <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
                      <p className="text-gray-600">You don't have any orders with this status.</p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6 overflow-hidden"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-green flex items-center justify-center text-white">
                              {getStatusIcon(order.status)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-800">Order {order.id}</h3>
                              <p className="text-sm text-gray-600">
                                Placed on {new Date(order.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            {getStatusBadge(order.status)}
                            <p className="text-xl font-bold text-gray-800">
                              {formatPrice(order.total)}
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                          <div className="space-y-3">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                              >
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.target.src =
                                      'https://via.placeholder.com/100x100?text=Product';
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{item.name}</p>
                                  <p className="text-sm text-gray-600">
                                    Quantity: {item.quantity} × {formatPrice(item.price)}
                                  </p>
                                </div>
                                <p className="font-bold text-gray-800">
                                  {formatPrice(item.price * item.quantity)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            to={`/orders/${order.id}`}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                          >
                            <FiEye />
                            View Details
                          </Link>
                          {order.status === 'delivered' && (
                            <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300">
                              <FiRotateCw />
                              Reorder
                            </button>
                          )}
                          {order.trackingNumber && (
                            <Link
                              to={`/track-order/${order.id}`}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                            >
                              <FiTruck />
                              Track Order
                            </Link>
                          )}
                        </div>

                        {/* Tracking Timeline (if shipped or delivered) */}
                        {['shipped', 'delivered'].includes(order.status) && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-4">Tracking</h4>
                            <div className="relative">
                              {getTrackingSteps(order.status).map((step, index) => (
                                <div key={index} className="flex items-center gap-4 mb-4">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      step.completed
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                    }`}
                                  >
                                    {step.completed ? (
                                      <FiCheckCircle className="text-sm" />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-current" />
                                    )}
                                  </div>
                                  <p
                                    className={`font-medium ${
                                      step.completed ? 'text-gray-800' : 'text-gray-400'
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {order.trackingNumber && (
                              <p className="text-sm text-gray-600 mt-4">
                                Tracking Number: <span className="font-semibold">{order.trackingNumber}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default Orders;


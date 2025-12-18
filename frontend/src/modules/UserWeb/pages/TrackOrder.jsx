import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiTruck, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useOrderStore } from '../../../shared/store/orderStore';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Badge from '../../../shared/components/Badge';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder } = useOrderStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const order = getOrder(orderId);

  useEffect(() => {
    if (!order) {
      navigate('/orders');
    }
  }, [order, navigate]);

  if (!order) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h2>
              <button
                onClick={() => navigate('/orders')}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
              >
                Back to Orders
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  const getTrackingSteps = () => {
    const steps = [
      {
        label: 'Order Placed',
        completed: true,
        date: order.date,
        description: 'Your order has been confirmed',
      },
      {
        label: 'Processing',
        completed: ['processing', 'shipped', 'delivered'].includes(order.status),
        date: order.status !== 'pending' ? new Date(new Date(order.date).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
        description: 'We are preparing your order',
      },
      {
        label: 'Shipped',
        completed: ['shipped', 'delivered'].includes(order.status),
        date: order.status === 'shipped' || order.status === 'delivered' 
          ? new Date(new Date(order.date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        description: 'Your order is on the way',
      },
      {
        label: 'Delivered',
        completed: order.status === 'delivered',
        date: order.status === 'delivered' ? order.estimatedDelivery : null,
        description: 'Your order has been delivered',
      },
    ];
    return steps;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDeliveryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const trackingSteps = getTrackingSteps();

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
              <Breadcrumbs />
              
              <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      Track Order #{order.id}
                    </h1>
                    <p className="text-gray-600">
                      Estimated delivery: {formatDeliveryDate(order.estimatedDelivery)}
                    </p>
                  </div>
                  <Badge variant={order.status === 'delivered' ? 'success' : 'info'}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Tracking Number */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-6 mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-1">Tracking Number</h3>
                      <p className="text-2xl font-bold text-primary-600 font-mono">
                        {order.trackingNumber}
                      </p>
                    </div>
                    <div className="p-4 bg-primary-100 rounded-xl">
                      <FiPackage className="text-3xl text-primary-600" />
                    </div>
                  </div>
                </motion.div>

                {/* Tracking Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-2xl p-6 mb-6"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-6">Order Status</h2>
                  <div className="relative">
                    {trackingSteps.map((step, index) => (
                      <div key={index} className="relative pb-8 last:pb-0">
                        {/* Timeline Line */}
                        {index < trackingSteps.length - 1 && (
                          <div
                            className={`absolute left-6 top-12 w-0.5 h-full ${
                              step.completed ? 'bg-primary-600' : 'bg-gray-200'
                            }`}
                          />
                        )}
                        
                        {/* Step Content */}
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.completed
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {step.completed ? (
                              <FiCheckCircle className="text-xl" />
                            ) : index === trackingSteps.findIndex(s => !s.completed) ? (
                              <FiClock className="text-xl" />
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-current" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3
                                className={`font-bold ${
                                  step.completed ? 'text-gray-800' : 'text-gray-400'
                                }`}
                              >
                                {step.label}
                              </h3>
                              {step.date && (
                                <span className="text-sm text-gray-500">
                                  {formatDate(step.date)}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-sm ${
                                step.completed ? 'text-gray-600' : 'text-gray-400'
                              }`}
                            >
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Delivery Address */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card rounded-2xl p-6 mb-6"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiMapPin className="text-green-500" />
                    Delivery Address
                  </h2>
                  <div className="space-y-1 text-gray-700">
                    <p className="font-semibold">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.address}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </motion.div>

                {/* Order Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-gray-800">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-bold text-gray-800">
                      <span>Total</span>
                      <span className="text-primary-600">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Back Button */}
                <div className="mt-6">
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <FiArrowLeft />
                    Back to Orders
                  </Link>
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

export default TrackOrder;


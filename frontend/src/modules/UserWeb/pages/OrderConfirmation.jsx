import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiCheckCircle, FiTruck, FiPackage, FiArrowLeft, FiEye } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useOrderStore } from '../../../shared/store/orderStore';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder } = useOrderStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const order = getOrder(orderId);

  useEffect(() => {
    if (!order) {
      navigate('/');
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
                onClick={() => navigate('/')}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
              >
                Go Home
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
            <div className="max-w-6xl mx-auto">
              <Breadcrumbs />
              
              {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center justify-center mb-8"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <FiCheckCircle className="text-6xl text-green-500" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
                Order Confirmed!
              </h1>
              <p className="text-gray-600 text-center">
                Thank you for your purchase. We've received your order.
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Order Details Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                          Order #{order.id}
                        </h2>
                        <p className="text-gray-600">
                          Placed on {formatDate(order.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-600">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-sm text-gray-600">Total Amount</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-bold text-gray-800 mb-4">Order Items</h3>
                      <div className="space-y-4">
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
                    </div>
                  </motion.div>

                  {/* Shipping Address */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card rounded-2xl p-6"
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FiPackage className="text-green-500" />
                      Shipping Address
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      <p className="font-semibold">{order.shippingAddress.name}</p>
                      <p>{order.shippingAddress.address}</p>
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                      <p className="text-gray-600">Phone: {order.shippingAddress.phone}</p>
                    </div>
                  </motion.div>

                  {/* Payment Method */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card rounded-2xl p-6"
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Payment Method</h3>
                    <p className="text-gray-700 capitalize">
                      {order.paymentMethod === 'card' 
                        ? 'Credit/Debit Card' 
                        : order.paymentMethod === 'cash' 
                        ? 'Cash on Delivery' 
                        : 'Bank Transfer'}
                    </p>
                  </motion.div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-2xl p-6 sticky top-4"
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h3>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatPrice(order.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span>
                          {order.shipping === 0 ? (
                            <span className="text-green-600 font-semibold">FREE</span>
                          ) : (
                            formatPrice(order.shipping)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>{formatPrice(order.tax)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-gray-800 pt-3 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-primary-600">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Estimated Delivery */}
                    <div className="mb-6 p-4 bg-primary-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <FiTruck className="text-primary-600" />
                        <h4 className="font-semibold text-gray-800">Estimated Delivery</h4>
                      </div>
                      <p className="text-gray-700">
                        {formatDeliveryDate(order.estimatedDelivery)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Link
                        to={`/track-order/${order.id}`}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                      >
                        <FiTruck />
                        Track Order
                      </Link>
                      <Link
                        to={`/orders/${order.id}`}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300"
                      >
                        <FiEye />
                        View Order Details
                      </Link>
                      <Link
                        to="/"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                      >
                        <FiArrowLeft />
                        Continue Shopping
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default OrderConfirmation;


import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiPackage, FiTruck, FiMapPin, FiCreditCard, FiRotateCw, FiDownload, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useOrderStore } from '../../../shared/store/orderStore';
import { useCartStore } from '../../../shared/store/useStore';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Badge from '../../../shared/components/Badge';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, cancelOrder } = useOrderStore();
  const { addItem } = useCartStore();
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      processing: 'processing',
      shipped: 'shipped',
      delivered: 'delivered',
      cancelled: 'cancelled',
    };
    return <Badge variant={variants[status] || 'pending'}>{status.toUpperCase()}</Badge>;
  };

  const handleReorder = () => {
    order.items.forEach((item) => {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
      });
    });
    toast.success('Items added to cart!');
    navigate('/checkout');
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      if (['pending', 'processing'].includes(order.status)) {
        cancelOrder(order.id);
        toast.success('Order cancelled successfully');
      } else {
        toast.error('This order cannot be cancelled');
      }
    }
  };

  const handleDownloadInvoice = () => {
    // Create a simple invoice text
    const invoiceText = `
INVOICE
Order #${order.id}
Date: ${formatDate(order.date)}

Items:
${order.items.map(item => `- ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`).join('\n')}

Subtotal: ${formatPrice(order.subtotal)}
${order.discount > 0 ? `Discount: -${formatPrice(order.discount)}\n` : ''}
Shipping: ${formatPrice(order.shipping)}
Tax: ${formatPrice(order.tax)}
Total: ${formatPrice(order.total)}

Shipping Address:
${order.shippingAddress.name}
${order.shippingAddress.address}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
${order.shippingAddress.country}
    `.trim();

    // Create blob and download
    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded!');
  };

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
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      Order #{order.id}
                    </h1>
                    <p className="text-gray-600">
                      Placed on {formatDate(order.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(order.status)}
                    <p className="text-2xl font-bold text-primary-600">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Order Items */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      <h2 className="text-xl font-bold text-gray-800 mb-6">Order Items</h2>
                      <div className="space-y-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-20 h-20 rounded-lg object-cover"
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
                    </motion.div>

                    {/* Shipping Address */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FiMapPin className="text-green-500" />
                        Shipping Address
                      </h2>
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

                    {/* Payment Information */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FiCreditCard className="text-green-500" />
                        Payment Information
                      </h2>
                      <div className="space-y-2">
                        <p className="text-gray-700 capitalize">
                          <span className="font-semibold">Method:</span>{' '}
                          {order.paymentMethod === 'card' 
                            ? 'Credit/Debit Card' 
                            : order.paymentMethod === 'cash' 
                            ? 'Cash on Delivery' 
                            : 'Bank Transfer'}
                        </p>
                        {order.trackingNumber && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Tracking Number:</span>{' '}
                            {order.trackingNumber}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-1">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="glass-card rounded-2xl p-6 sticky top-4"
                    >
                      <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>
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

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        {order.status === 'delivered' && (
                          <button
                            onClick={handleReorder}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300"
                          >
                            <FiRotateCw />
                            Reorder
                          </button>
                        )}
                        <button
                          onClick={handleDownloadInvoice}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                        >
                          <FiDownload />
                          Download Invoice
                        </button>
                        {['pending', 'processing'].includes(order.status) && (
                          <button
                            onClick={handleCancel}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
                          >
                            <FiX />
                            Cancel Order
                          </button>
                        )}
                        <Link
                          to={`/track-order/${order.id}`}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                        >
                          <FiTruck />
                          Track Order
                        </Link>
                      </div>
                    </motion.div>
                  </div>
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

export default OrderDetail;


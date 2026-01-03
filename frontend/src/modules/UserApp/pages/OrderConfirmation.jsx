import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiCheckCircle, FiTruck, FiPackage, FiArrowLeft, FiEye } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { getOrderById } from '../../../shared/services/orderService';
import { formatPrice } from '../../../shared/utils/helpers';
import PageTransition from '../../../shared/components/PageTransition';
import LazyImage from '../../../shared/components/LazyImage';
import toast from 'react-hot-toast';

const MobileOrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate('/app');
        return;
      }

      try {
        setLoading(true);
        const response = await getOrderById(orderId);
        if (response.success && response.data?.order) {
          setOrder(response.data.order);
        } else {
          toast.error('Order not found');
          navigate('/app');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order');
        navigate('/app');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Loading order...</h2>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  if (!order) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Not Found</h2>
              <button
                onClick={() => navigate('/app')}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
              >
                Go Home
              </button>
            </div>
          </div>
        </MobileLayout>
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

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={false}>
        <div className="w-full min-h-screen flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center justify-center mb-8"
            >
              <div className="w-24 h-24 gradient-green rounded-full flex items-center justify-center mb-4 shadow-glow-green">
                <FiCheckCircle className="text-white text-5xl" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Confirmed!</h1>
              <p className="text-gray-600 text-center text-sm">
                Thank you for your purchase. Your order has been received and is being processed.
              </p>
            </motion.div>

            {/* Order Details */}
            <div className="glass-card rounded-2xl p-6 mb-4">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-1">Order Number</p>
                <p className="text-xl font-bold text-gray-800">{order.orderCode || order.id || order._id}</p>
                {(order.tracking?.trackingNumber || order.trackingNumber) && (
                  <>
                    <p className="text-sm text-gray-600 mt-3 mb-1">Tracking Number</p>
                    <p className="text-lg font-bold text-primary-600">{order.tracking?.trackingNumber || order.trackingNumber}</p>
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-semibold text-gray-800">{formatDate(order.orderDate || order.createdAt || order.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-primary-600 text-lg">{formatPrice(order.pricing?.total || order.total || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-semibold text-gray-800 capitalize">{order.paymentMethod || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Status</span>
                  <span className={`font-semibold capitalize ${order.paymentStatus === 'completed' ? 'text-green-600' : order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {order.paymentStatus || 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items Summary */}
            {order.items && order.items.length > 0 && (
              <div className="glass-card rounded-2xl p-6 mb-4">
                <h2 className="text-base font-bold text-gray-800 mb-4">Order Items</h2>
                <div className="space-y-3">
                  {order.items.slice(0, 3).map((item, idx) => {
                    const itemId = item._id || item.id || item.productId?._id || idx;
                    const itemImage = item.image || item.productId?.images?.[0] || '/placeholder.png';
                    const itemName = item.name || item.productId?.name || 'Product';
                    const itemPrice = item.price || 0;
                    const itemQuantity = item.quantity || 1;
                    
                    return (
                      <div key={itemId} className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          <LazyImage
                            src={itemImage}
                            alt={itemName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm mb-1">{itemName}</h3>
                          <p className="text-xs text-gray-600">
                            {formatPrice(itemPrice)} × {itemQuantity}
                          </p>
                        </div>
                        <p className="font-bold text-gray-800 text-sm">
                          {formatPrice(itemPrice * itemQuantity)}
                        </p>
                      </div>
                    );
                  })}
                  {order.items.length > 3 && (
                    <p className="text-sm text-gray-600 text-center pt-2">
                      +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Link
                to={`/app/orders/${order._id || order.id || order.orderCode}`}
                className="block w-full py-3 gradient-green text-white rounded-xl font-semibold text-center hover:shadow-glow-green transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <FiEye className="text-lg" />
                  View Order Details
                </div>
              </Link>
              <Link
                to={`/app/track-order/${order._id || order.id || order.orderCode}`}
                className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-center hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-center justify-center gap-2">
                  <FiTruck className="text-lg" />
                  Track Order
                </div>
              </Link>
              <button
                onClick={() => navigate('/app')}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileOrderConfirmation;


import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiTruck, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { getOrderById } from '../../../shared/services/orderService';
import { formatPrice } from '../../../shared/utils/helpers';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import Badge from '../../../shared/components/Badge';
import LazyImage from '../../../shared/components/LazyImage';
import toast from 'react-hot-toast';

const MobileTrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate('/app/orders');
        return;
      }

      try {
        setLoading(true);
        const data = await getOrderById(orderId);
        if (data?.order) {
          setOrder(data.order);
        } else {
          toast.error('Order not found');
          navigate('/app/orders');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order');
        navigate('/app/orders');
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
                onClick={() => navigate('/app/orders')}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
              >
                Back to Orders
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTrackingSteps = () => {
    const statusHistory = order.statusHistory || [];
    const orderDate = order.orderDate || order.createdAt || order.date;

    // Find timestamps from status history
    const pendingEntry = statusHistory.find(h => h.status === 'pending') || { timestamp: orderDate };
    const processingEntry = statusHistory.find(h => h.status === 'processing');
    const shippedEntry = statusHistory.find(h => ['shipped', 'shipped_seller', 'dispatched'].includes(h.status));
    const deliveredEntry = statusHistory.find(h => h.status === 'delivered') ||
      (order.tracking?.deliveredAt ? { timestamp: order.tracking.deliveredAt } : null);

    const steps = [
      {
        label: 'Order Placed',
        completed: true,
        date: pendingEntry?.timestamp || orderDate,
        icon: FiCheckCircle,
      },
      {
        label: 'Processing',
        completed: ['processing', 'ready_to_ship', 'dispatched', 'shipped', 'shipped_seller', 'delivered'].includes(order.status),
        date: processingEntry?.timestamp || (order.status !== 'pending' && order.status !== 'cancelled' ? new Date(new Date(orderDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : null),
        icon: FiPackage,
      },
      {
        label: 'Shipped',
        completed: ['shipped', 'shipped_seller', 'dispatched', 'delivered'].includes(order.status),
        date: shippedEntry?.timestamp || (['shipped', 'shipped_seller', 'dispatched', 'delivered'].includes(order.status) ? new Date(new Date(orderDate).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : null),
        icon: FiTruck,
      },
      {
        label: 'Delivered',
        completed: order.status === 'delivered',
        date: deliveredEntry?.timestamp || (order.status === 'delivered' ? order.tracking?.deliveredAt : null) || (order.tracking?.estimatedDelivery && order.status === 'delivered' ? order.tracking.estimatedDelivery : null),
        icon: FiCheckCircle,
      },
    ];
    return steps;
  };

  const steps = getTrackingSteps();

  return (
    <ProtectedRoute>
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={true}>
          <div className="w-full pb-24">
            {/* Header */}
            <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-1 z-30">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="text-xl text-gray-700" />
                </button>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-800">Track Order</h1>
                  <p className="text-sm text-gray-600">Order #{order.orderCode || order.id || order._id}</p>
                </div>
                <Badge status={order.status}>{order.status?.toUpperCase() || 'PENDING'}</Badge>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Tracking Timeline */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-4">Order Status</h2>
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${step.completed
                          ? 'gradient-green text-white'
                          : 'bg-gray-200 text-gray-500'
                          }`}>
                          <Icon className="text-lg" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold text-sm mb-1 ${step.completed ? 'text-gray-800' : 'text-gray-500'
                            }`}>
                            {step.label}
                          </h3>
                          <p className="text-xs text-gray-500">{formatDate(step.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tracking Number */}
              {(order.tracking?.trackingNumber || order.trackingNumber) && (
                <div className="glass-card rounded-2xl p-4">
                  <h2 className="text-base font-bold text-gray-800 mb-2">Tracking Number</h2>
                  <p className="text-lg font-bold text-primary-600">{order.tracking?.trackingNumber || order.trackingNumber}</p>
                  {order.tracking?.carrier && (
                    <p className="text-sm text-gray-600 mt-1">Carrier: {order.tracking.carrier}</p>
                  )}
                  {order.tracking?.estimatedDelivery && (
                    <p className="text-xs text-gray-500 mt-1">Estimated Delivery: {formatDate(order.tracking.estimatedDelivery)}</p>
                  )}
                </div>
              )}

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="glass-card rounded-2xl p-4">
                  <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FiMapPin className="text-primary-600" />
                    Shipping Address
                  </h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-800">{order.shippingAddress.name || order.shippingAddress.fullName || 'N/A'}</p>
                    {order.shippingAddress.address && <p>{order.shippingAddress.address}</p>}
                    {(order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.zipCode) && (
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                        {order.shippingAddress.zipCode}
                      </p>
                    )}
                    {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                    {order.shippingAddress.phone && <p className="mt-2">Phone: {order.shippingAddress.phone}</p>}
                  </div>
                </div>
              )}

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="glass-card rounded-2xl p-4">
                  <h2 className="text-base font-bold text-gray-800 mb-3">Order Items</h2>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => {
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
                  </div>
                </div>
              )}

              {/* Estimated Delivery */}
              {(order.tracking?.estimatedDelivery || order.estimatedDelivery) && (
                <div className="glass-card rounded-2xl p-4">
                  <h2 className="text-base font-bold text-gray-800 mb-2">Estimated Delivery</h2>
                  <p className="text-lg font-semibold text-primary-600">
                    {formatDate(order.tracking?.estimatedDelivery || order.estimatedDelivery)}
                  </p>
                </div>
              )}

              {/* Actions */}
              <button
                onClick={() => navigate(`/app/orders/${order._id || order.id || order.orderCode}`)}
                className="w-full py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all"
              >
                View Order Details
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default MobileTrackOrder;


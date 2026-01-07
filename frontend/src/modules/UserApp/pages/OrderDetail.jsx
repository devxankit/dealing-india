import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPackage, FiTruck, FiMapPin, FiCreditCard, FiRotateCw, FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { getOrderById, cancelOrder } from '../../../shared/services/orderService';
import { useCartStore } from '../../../shared/store/useStore';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import Badge from '../../../shared/components/Badge';
import LazyImage from '../../../shared/components/LazyImage';
import ReviewModal from '../../../shared/components/ReviewModal';
import { createReview, checkReviewEligibility } from '../../../shared/services/reviewService';
import { FiStar } from 'react-icons/fi';

const MobileOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const [order, setOrder] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate('/app/orders');
        return;
      }

      try {
        setIsLoading(true);
        const data = await getOrderById(orderId);
        if (data?.order) {
          setOrder(data.order);

          // Check Return Eligibility if order is delivered
          if (data.order.status === 'delivered') {
            import('../../../shared/services/returnService').then(async ({ checkReturnEligibility }) => {
              try {
                const eligResponse = await checkReturnEligibility(orderId);
                // eligResponse might need checking too depending on returnService
                if (eligResponse?.data?.eligible !== undefined) {
                  setEligibility(eligResponse.data);
                } else if (eligResponse?.eligible !== undefined) {
                  setEligibility(eligResponse);
                } else if (eligResponse?.success && eligResponse?.data) {
                  setEligibility(eligResponse.data);
                }
              } catch (e) {
                console.error("Eligibility check failed", e);
              }
            });
          }
        } else {
          toast.error('Order not found');
          navigate('/app/orders');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order');
        navigate('/app/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  const handleReturn = () => {
    navigate(`/app/return-request/${orderId}`);
  };

  if (isLoading) {
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleReorder = () => {
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        const productId = item.productId?._id || item.productId || item.id;
        addItem({
          id: productId,
          productId: productId,
          name: item.name,
          price: item.price,
          image: item.image || item.productId?.images?.[0] || '/placeholder.png',
          quantity: item.quantity,
        });
      });
      toast.success('Items added to cart!');
      navigate('/app/checkout');
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      if (['pending', 'processing'].includes(order.status)) {
        try {
          const response = await cancelOrder(order._id || order.id || order.orderCode);
          if (response.success) {
            toast.success('Order cancelled successfully');
            navigate('/app/orders');
          } else {
            toast.error('Failed to cancel order');
          }
        } catch (error) {
          console.error('Error cancelling order:', error);
          toast.error(error.response?.data?.message || 'Failed to cancel order');
        }
      } else {
        toast.error('This order cannot be cancelled');
      }
    }
  };

  const handleRateProduct = async (item) => {
    const productId = item.productId?._id || item.productId || item.id;

    // Optimistic check or just open modal and let backend handle verification on submit?
    // Let's check eligibility first to be safe and get orderId if complex, 
    // but here we know the orderId is `order._id`.
    // However, the service `checkReviewEligibility` checks if *any* order allows it.
    // Since we are in a specific order context, we should pass this orderId to createReview.

    // Let's verify if user already reviewed THIS specific purchase?
    // For now, just open modal.
    setSelectedProductForReview({
      ...item,
      id: productId,
      name: item.name || item.productId?.name,
      image: item.image || item.productId?.images?.[0]
    });
    setIsReviewModalOpen(true);
  };

  const submitReview = async ({ rating, comment }) => {
    if (!selectedProductForReview) return;

    setIsSubmittingReview(true);
    try {
      await createReview({
        productId: selectedProductForReview.id,
        orderId: order._id || order.id,
        rating,
        comment
      });
      toast.success('Review submitted successfully!');
      setIsReviewModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
                  <h1 className="text-xl font-bold text-gray-800">Order Details</h1>
                  <p className="text-sm text-gray-600">Order #{order.orderCode || order.id}</p>
                </div>
                <Badge status={order.status}>{order.status.toUpperCase()}</Badge>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Order Items */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-4">Order Items</h2>
                {order.vendorBreakdown && order.vendorBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {order.vendorBreakdown.map((vendorGroup, vendorIdx) => {
                      // Get items for this vendor
                      const vendorItems = order.items.filter((item) => {
                        const productVendorId = item.productId?.vendorId?._id || item.productId?.vendorId || item.vendorId;
                        return productVendorId && productVendorId.toString() === (vendorGroup.vendorId?._id || vendorGroup.vendorId)?.toString();
                      });

                      return (
                        <div key={vendorGroup.vendorId?._id || vendorGroup.vendorId || vendorIdx} className="space-y-2">
                          {/* Vendor Header */}
                          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200/50">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                              <FiShoppingBag className="text-white text-[10px]" />
                            </div>
                            <span className="text-sm font-bold text-primary-700 flex-1">
                              {vendorGroup.vendorName || vendorGroup.vendorId?.name || 'Vendor'}
                            </span>
                            <span className="text-xs font-semibold text-primary-600 bg-white px-2 py-0.5 rounded-md">
                              {formatPrice(vendorGroup.subtotal || 0)}
                            </span>
                          </div>
                          {/* Vendor Items */}
                          <div className="space-y-2 pl-2">
                            {vendorItems.map((item, itemIdx) => {
                              const itemImage = item.image || item.productId?.images?.[0] || '/placeholder.png';
                              const itemName = item.name || item.productId?.name || 'Product';
                              const itemPrice = item.price || 0;
                              const itemQuantity = item.quantity || 1;
                              const itemId = item._id || item.id || itemIdx;

                              return (
                                <div key={itemId} className="flex flex-col gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
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
                                  {order.status === 'delivered' && (
                                    <div className="pl-[60px]">
                                      <button
                                        onClick={() => handleRateProduct(item)}
                                        className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-primary-100 transition-colors"
                                      >
                                        <FiStar className="text-primary-600" />
                                        Rate Product
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );

                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {order.items && order.items.length > 0 ? order.items.map((item, idx) => {
                      const itemImage = item.image || item.productId?.images?.[0] || '/placeholder.png';
                      const itemName = item.name || item.productId?.name || 'Product';
                      const itemPrice = item.price || 0;
                      const itemQuantity = item.quantity || 1;
                      const itemId = item._id || item.id || idx;

                      return (
                        <div key={itemId} className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
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
                          {order.status === 'delivered' && (
                            <div className="pl-[76px]">
                              <button
                                onClick={() => handleRateProduct(item)}
                                className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-primary-100 transition-colors"
                              >
                                <FiStar className="text-primary-600" />
                                Rate Product
                              </button>
                            </div>
                          )}
                        </div>
                      );

                    }) : (
                      <p className="text-gray-500 text-center py-4">No items found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMapPin className="text-primary-600" />
                  Shipping Address
                </h2>
                {order.shippingAddress ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.address}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                      {order.shippingAddress.zipCode}
                    </p>
                    <p>{order.shippingAddress.country || 'India'}</p>
                    {order.shippingAddress.phone && (
                      <p className="mt-2">Phone: {order.shippingAddress.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Address not available</p>
                )}
              </div>

              {/* Payment Info */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiCreditCard className="text-primary-600" />
                  Payment Information
                </h2>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {order.paymentMethod}
                    </span>
                  </div>
                  {order.tracking?.trackingNumber && (
                    <div className="flex justify-between">
                      <span>Tracking Number:</span>
                      <span className="font-semibold text-gray-800">{order.tracking.trackingNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Order Date:</span>
                    <span className="font-semibold text-gray-800">{formatDate(order.orderDate || order.createdAt || order.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <Badge status={order.paymentStatus || 'pending'}>{order.paymentStatus || 'Pending'}</Badge>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3">Order Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.pricing?.subtotal || order.subtotal || 0)}</span>
                  </div>
                  {(order.pricing?.discount || order.discount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(order.pricing?.discount || order.discount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{formatPrice(order.pricing?.shipping || order.shipping || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatPrice(order.pricing?.tax || order.tax || 0)}</span>
                  </div>
                  {(order.pricing?.platformFee || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Platform Fee</span>
                      <span>{formatPrice(order.pricing.platformFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-primary-600">{formatPrice(order.pricing?.total || order.total || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {['pending', 'processing'].includes(order.status) && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}

                {order.status === 'delivered' && eligibility?.eligible && (
                  <button
                    onClick={handleReturn}
                    className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <FiRotateCw className="text-lg" />
                    Request Return
                  </button>
                )}

                <button
                  onClick={handleReorder}
                  className="w-full py-3 gradient-green text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-glow-green transition-all"
                >
                  <FiRotateCw className="text-lg" />
                  Reorder
                </button>
                <button
                  onClick={() => navigate(`/app/track-order/${order._id || order.id || order.orderCode}`)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  <FiTruck className="text-lg" />
                  Track Order
                </button>
              </div>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={submitReview}
        isSubmitting={isSubmittingReview}
        product={selectedProductForReview}
      />
    </ProtectedRoute >
  );
};

export default MobileOrderDetail;


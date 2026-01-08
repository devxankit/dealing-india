import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiCheck, 
  FiX, 
  FiPhone, 
  FiMapPin, 
  FiCreditCard, 
  FiTruck, 
  FiCalendar, 
  FiTag,
  FiPackage,
  FiClock,
  FiMail,
  FiUser,
  FiFileText
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import Badge from '../../../shared/components/Badge';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatCurrency, formatDateTime } from '../utils/adminHelpers';
import { getAdminOrderById, updateAdminOrderStatus } from '../../../shared/services/orderService';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await getAdminOrderById(id);
        if (response.success && response.data?.order) {
          setOrder(response.data.order);
          setStatus(response.data.order.status);
        } else {
          toast.error('Order not found');
          navigate('/admin/orders/all-orders');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order');
        navigate('/admin/orders/all-orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await updateAdminOrderStatus(id, newStatus);
      if (response.success) {
        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        setStatus(newStatus);
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const formatPaymentMethod = (method) => {
    if (!method) return 'N/A';
    const methods = {
      'creditCard': 'Credit Card',
      'debitCard': 'Debit Card',
      'upi': 'UPI',
      'wallet': 'Wallet',
      'cash': 'Cash on Delivery',
      'cod': 'Cash on Delivery'
    };
    return methods[method] || method.charAt(0).toUpperCase() + method.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
        <FiPackage className="mx-auto text-4xl text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6">The order you're looking for doesn't exist or has been removed.</p>
        <Link 
          to="/admin/orders/all-orders" 
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <FiArrowLeft />
          Back to All Orders
        </Link>
      </div>
    );
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'processing', label: 'Processing', color: 'blue' },
    { value: 'ready_to_ship', label: 'Ready to Ship', color: 'indigo' },
    { value: 'dispatched', label: 'Dispatched', color: 'purple' },
    { value: 'shipped', label: 'Shipped', color: 'purple' },
    { value: 'shipped_seller', label: 'Shipped (Seller)', color: 'purple' },
    { value: 'delivered', label: 'Delivered', color: 'green' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' },
    { value: 'on_hold', label: 'On Hold', color: 'orange' },
  ];

  const items = Array.isArray(order.items) ? order.items : [];
  const pricing = order.pricing || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders/all-orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white shadow-sm"
          >
            <FiArrowLeft className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Order #{order.orderCode || order.id}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <FiCalendar />
              Placed on {new Date(order.date || order.createdAt || order.orderDate).toLocaleDateString()} at {new Date(order.date || order.createdAt || order.orderDate).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/orders/${id}/invoice`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold shadow-sm"
          >
            <FiFileText />
            Invoice
          </button>
          <AnimatedSelect
            options={statusOptions}
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            color={statusOptions.find(opt => opt.value === status)?.color || 'gray'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FiPackage />
                Order Items ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {items.length > 0 ? items.map((item, index) => {
                const itemId = item._id || item.id || item.productId?._id || index;
                const itemImage = item.image || item.productId?.images?.[0] || 'https://via.placeholder.com/100x100?text=Product';
                const itemName = item.name || item.productId?.name || 'Product';
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;

                return (
                  <div key={itemId} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src={itemImage}
                        alt={itemName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=Product';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-800 truncate">{itemName}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Unit Price: {formatCurrency(itemPrice)}
                          </p>
                          <p className="text-sm font-medium text-primary-600 mt-1">
                            Qty: {itemQuantity}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900">
                          {formatCurrency(itemPrice * itemQuantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-8 text-center text-gray-500">
                  <FiPackage className="mx-auto text-3xl mb-2 opacity-20" />
                  <p>No items found in this order</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment & Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiCreditCard className="text-primary-500" />
                Payment Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Method</span>
                  <span className="font-semibold text-gray-800">{formatPaymentMethod(order.paymentMethod)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Payment Status</span>
                  <Badge variant={order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'delivered' : order.paymentStatus === 'pending' ? 'pending' : 'cancelled'}>
                    {order.paymentStatus || (order.paymentMethod === 'cash' || order.paymentMethod === 'cod' ? 'Pending' : 'Paid')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-medium">Transaction ID</span>
                  <span className="font-mono text-xs text-gray-600">{order.razorpayPaymentId || order.paymentDetails?.transactionId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiTruck className="text-primary-500" />
                Shipping & Tracking
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Courier</span>
                  <span className="font-semibold text-gray-800">{order.tracking?.carrier || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Tracking Number</span>
                  <span className="font-mono text-xs text-primary-600 font-bold">{order.tracking?.trackingNumber || order.trackingNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-medium">Last Update</span>
                  <span className="text-xs text-gray-600">{order.tracking?.lastUpdate ? new Date(order.tracking.lastUpdate).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 mb-4 text-lg">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-800">{formatCurrency(pricing.subtotal || order.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium text-gray-800">{formatCurrency(pricing.tax || order.tax || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium text-gray-800">{formatCurrency(pricing.shipping || order.shipping || 0)}</span>
              </div>
              {pricing.platformFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Fee</span>
                  <span className="font-medium text-gray-800">{formatCurrency(pricing.platformFee)}</span>
                </div>
              )}
              {(pricing.discount > 0 || order.discount > 0) && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatCurrency(pricing.discount || order.discount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <span className="text-base font-bold text-gray-800">Total</span>
                <span className="text-xl font-extrabold text-primary-600">
                  {formatCurrency(pricing.total || order.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiUser className="text-primary-500" />
              Customer Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FiUser className="text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Name</p>
                  <p className="font-medium text-gray-800">{order.customerSnapshot?.name || order.customerId?.name || order.customer?.name || 'Guest Customer'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FiMail className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email</p>
                  <p className="font-medium text-gray-800 truncate">{order.customerSnapshot?.email || order.customerId?.email || order.customer?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FiPhone className="text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phone</p>
                  <p className="font-medium text-gray-800">{order.customerSnapshot?.phone || order.customerId?.phone || order.customer?.phone || order.shippingAddress?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiMapPin className="text-primary-500" />
              Shipping Address
            </h2>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              {order.shippingAddress ? (
                <div className="text-sm text-gray-700 space-y-1 leading-relaxed">
                  <p className="font-bold text-gray-800">{order.shippingAddress.name || order.customerSnapshot?.name}</p>
                  <p>{order.shippingAddress.address || order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                  <p className="font-medium">{order.shippingAddress.country || 'India'}</p>
                  {order.shippingAddress.phone && (
                    <p className="pt-2 flex items-center gap-2 text-gray-500">
                      <FiPhone className="text-xs" />
                      {order.shippingAddress.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No shipping address provided</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;


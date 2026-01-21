import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiMapPin, FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import { IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import { getVendorOrderById, updateVendorOrderStatus } from '../../../../shared/services/orderService';
import { useVendorAuthStore } from '../../store/vendorAuthStore';
import { formatPrice } from '../../../../shared/utils/helpers';
import Badge from '../../../../shared/components/Badge';
import AnimatedSelect from '../../../Admin/components/AnimatedSelect';
import toast from 'react-hot-toast';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { vendor } = useVendorAuthStore();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return;

            try {
                setLoading(true);
                const data = await getVendorOrderById(id);
                if (data?.data?.order) {
                    setOrder(data.data.order);
                } else if (data?.order) {
                    setOrder(data.order);
                } else {
                    toast.error('Order not found');
                    navigate('/vendor/orders');
                }
            } catch (error) {
                console.error('Error fetching order:', error);
                toast.error('Failed to load order');
                navigate('/vendor/orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id, navigate]);

    const handleStatusChange = async (newStatus) => {
        try {
            const data = await updateVendorOrderStatus(id, newStatus);
            // Service returns unpacked data, so we check if we got an order object back
            if (data?.data?.order) {
                setOrder(prev => prev ? { ...prev, status: newStatus } : null);
                toast.success(`Order status updated to ${newStatus}`);
            } else if (data?.order) {
                setOrder(prev => prev ? { ...prev, status: newStatus } : null);
                toast.success(`Order status updated to ${newStatus}`);
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'yellow' },
        { value: 'processing', label: 'Processing', color: 'blue' },
        { value: 'ready_to_ship', label: 'Ready to Ship', color: 'indigo' },
        { value: 'dispatched', label: 'Dispatched', color: 'purple' },
        { value: 'shipped_seller', label: 'Shipped', color: 'purple' },
        { value: 'delivered', label: 'Delivered', color: 'green' },
        { value: 'on_hold', label: 'On Hold', color: 'orange' },
        { value: 'cancelled', label: 'Cancelled', color: 'red' }
    ];

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!order) {
        return (
            <div className="p-6 text-center">
                <p>Order not found</p>
                <Link to="/vendor/orders" className="text-blue-600 hover:underline">Back to Orders</Link>
            </div>
        );
    }

    // Get vendor items from vendorItems array (already filtered by backend)
    const vendorItems = order?.vendorItems?.[0]?.items || order?.items || [];

    // Get order ID for navigation
    const orderId = order?._id || order?.id || order?.orderCode;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/vendor/orders/all-orders"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Order #{order.orderCode || order.id}</h1>
                        <p className="text-sm text-gray-500">
                            Placed on {new Date(order.date || order.createdAt || order.orderDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge status={order.status} />
                    <AnimatedSelect
                        options={statusOptions}
                        value={order.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        color={statusOptions.find(opt => opt.value === order.status)?.color || 'gray'}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <FiPackage />
                                Order Items
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {vendorItems.length > 0 ? vendorItems.map((item, index) => {
                                const itemId = item._id || item.id || item.productId?._id || index;
                                const itemImage = item.image || item.productId?.images?.[0] || '/placeholder.png';
                                const itemName = item.name || item.productId?.name || 'Product';
                                const itemPrice = item.price || 0;
                                const itemQuantity = item.quantity || 1;

                                return (
                                    <div key={itemId} className="p-4 flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img
                                                src={itemImage}
                                                alt={itemName}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = '/placeholder.png';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-gray-800">{itemName}</h3>
                                                    {item.variant && (
                                                        <p className="text-sm text-gray-500">
                                                            {item.variant.size && <span className="mr-2">Size: <span className="font-semibold">{item.variant.size}</span></span>}
                                                            {item.variant.color && <span>Color: <span className="font-semibold">{item.variant.color}</span></span>}
                                                            {/* Fallback for indices if names missing - difficult without product data but we can try */}
                                                            {(!item.variant.size && !item.variant.color) && (
                                                                <span className="text-xs text-gray-400">
                                                                    Variant: {Object.entries(item.variant)
                                                                        .filter(([k]) => !['colorIndex', 'sizeIndex', 'isRootSize', 'prices'].includes(k))
                                                                        .map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                                </span>
                                                            )}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-500">Qty: {itemQuantity}</p>
                                                </div>
                                                <p className="font-semibold text-gray-800">
                                                    {formatPrice(itemPrice * itemQuantity)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-4 text-center text-gray-500">No items found</div>
                            )}
                        </div>
                    </div>

                    {/* Order Summary */}
                    {order.vendorItems?.[0] && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium text-gray-800">{formatPrice(order.vendorItems[0].subtotal || 0)}</span>
                                </div>
                                {(order.vendorItems[0].tax || 0) >= 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tax</span>
                                        <span className="font-medium text-gray-800">{formatPrice(order.vendorItems[0].tax || 0)}</span>
                                    </div>
                                )}
                                {(order.vendorItems[0].shipping || 0) >= 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Shipping</span>
                                        <span className="font-medium text-gray-800">{formatPrice(order.vendorItems[0].shipping || 0)}</span>
                                    </div>
                                )}
                                {(order.pricing?.platformFee || 0) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Platform Fee</span>
                                        <span className="font-medium text-gray-800">{formatPrice(order.pricing.platformFee)}</span>
                                    </div>
                                )}
                                {(order.vendorItems[0].discount || 0) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Discount</span>
                                        <span className="text-green-600 font-medium">-{formatPrice(order.vendorItems[0].discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t font-semibold">
                                    <span className="text-gray-800">Total Payment</span>
                                    <span className="text-gray-900">
                                        {formatPrice(
                                            (order.vendorItems[0].subtotal || 0) +
                                            (order.vendorItems[0].tax || 0) +
                                            (order.vendorItems[0].shipping || 0) +
                                            (order.pricing?.platformFee || 0) -
                                            (order.vendorItems[0].discount || 0)
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t italic">
                                    <span className="text-gray-500 text-xs">Commission (Admin Share)</span>
                                    <span className="text-red-500 text-xs text-right">-{formatPrice(order.vendorItems[0].commission || 0)}</span>
                                </div>
                                <div className="flex justify-between pt-1 font-bold bg-green-50 p-2 rounded-lg">
                                    <div className="flex flex-col">
                                        <span className="text-green-800">Your Earnings</span>
                                        <span className="text-[10px] text-gray-500 font-normal">(Subtotal - Discount - Commission)</span>
                                    </div>
                                    <span className="text-green-700">
                                        {formatPrice(
                                            (order.vendorItems[0].subtotal || 0) -
                                            (order.vendorItems[0].discount || 0) -
                                            (order.vendorItems[0].commission || 0)
                                        )}
                                    </span>
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-700 leading-tight">
                                        * Note: Tax and Shipping charges are collected by the Admin. Vendor earnings are calculated based on the product subtotal minus any discounts and commissions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiUser />
                            Customer Details
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-medium">{order.customer?.name || order.customerSnapshot?.name || 'Guest'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{order.customer?.email || order.customerSnapshot?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium">{order.customer?.phone || order.customerSnapshot?.phone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiMapPin />
                            Shipping Address
                        </h2>
                        {order.shippingAddress ? (
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {order.shippingAddress.address || order.shippingAddress.street}<br />
                                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                                {order.shippingAddress.country || 'India'}
                            </p>
                        ) : (
                            <p className="text-gray-500 text-sm">Address not available</p>
                        )}
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4">Payment Info</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Method</span>
                                <span className="font-medium capitalize">{order.paymentMethod || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status</span>
                                <Badge status={order.paymentStatus} />
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold">Total</span>
                                <span className="font-bold">{formatPrice(order.pricing?.total || order.total || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;

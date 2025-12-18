import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiMapPin, FiUser, FiCalendar, FiClock, FiDollarSign } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useOrderStore } from '../../../../shared/store/orderStore';
import { useVendorAuthStore } from '../../store/vendorAuthStore';
import { formatPrice } from '../../../../shared/utils/helpers';
import Badge from '../../../../shared/components/Badge';
import AnimatedSelect from '../../../Admin/components/AnimatedSelect';
import toast from 'react-hot-toast';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getOrder, updateOrderStatus } = useOrderStore();
    const { vendor } = useVendorAuthStore();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const foundOrder = getOrder(id);
            setOrder(foundOrder);
            setLoading(false);
        }
    }, [id, getOrder]);

    const handleStatusChange = async (newStatus) => {
        try {
            await updateOrderStatus(id, newStatus);
            const updatedOrder = getOrder(id);
            setOrder(updatedOrder);
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'yellow' },
        { value: 'processing', label: 'Processing', color: 'blue' },
        { value: 'shipped', label: 'Shipped', color: 'purple' },
        { value: 'delivered', label: 'Delivered', color: 'green' },
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

    // Filter items for this vendor
    const vendorItems = order.items.filter(item => item.vendorId === vendor?.id);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/vendor/orders"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Order #{order.id}</h1>
                        <p className="text-sm text-gray-500">
                            Placed on {new Date(order.date).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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
                            {vendorItems.map((item, index) => (
                                <div key={index} className="p-4 flex gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-gray-800">{item.name}</h3>
                                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                            </div>
                                            <p className="font-semibold text-gray-800">
                                                {formatPrice(item.price * item.quantity)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                <p className="font-medium">{order.customer?.name || 'Guest'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{order.customer?.email || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiMapPin />
                            Shipping Address
                        </h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {order.address?.street}<br />
                            {order.address?.city}, {order.address?.state} {order.address?.zipCode}<br />
                            {order.address?.country}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;

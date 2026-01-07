import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiX, FiMail, FiPhone, FiCalendar, FiShoppingBag, 
    FiCreditCard, FiUser, FiMapPin, FiClock 
} from 'react-icons/fi';
import { formatPrice } from '../../../../../shared/utils/helpers';
import { formatDateTime, formatDate } from '../../../utils/adminHelpers';
import api from '../../../../../shared/utils/api';
import Badge from '../../../../../shared/components/Badge';
import toast from 'react-hot-toast';

const CustomerDetailModal = ({ isOpen, onClose, customerId }) => {
    const [loading, setLoading] = useState(true);
    const [customerData, setCustomerData] = useState(null);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        if (isOpen && customerId) {
            fetchCustomerDetails();
        }
    }, [isOpen, customerId]);

    const fetchCustomerDetails = async () => {
        setLoading(true);
        try {
            // Fetch analytics for this customer which includes profile and basic stats
            const response = await api.get(`/admin/customers/analytics/${customerId}`);
            if (response.success) {
                setCustomerData(response.data);
            }

            // Fetch recent orders
            const ordersResponse = await api.get(`/admin/customers/${customerId}/orders`);
            if (ordersResponse.success && ordersResponse.data?.orders) {
                setOrders(ordersResponse.data.orders.slice(0, 5)); // Just top 5
            }
        } catch (error) {
            console.error('Failed to fetch customer details:', error);
            toast.error('Failed to load customer details');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <h2 className="text-xl font-bold text-gray-800">Customer Details</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-medium">Loading details...</p>
                            </div>
                        ) : customerData ? (
                            <div className="space-y-8">
                                {/* Profile Summary */}
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="w-20 h-20 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center text-3xl font-bold">
                                        {customerData.customer?.name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-2xl font-bold text-gray-800">{customerData.customer?.name}</h3>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <FiMail className="text-gray-400" />
                                                {customerData.customer?.email}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <FiPhone className="text-gray-400" />
                                                {customerData.customer?.phone || 'No phone'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <FiCalendar className="text-gray-400" />
                                                Joined {customerData.customer?.joinedDate || customerData.customer?.createdAt
                                                    ? formatDate(customerData.customer?.joinedDate || customerData.customer?.createdAt)
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <Badge variant={customerData.customer?.status === 'active' ? 'delivered' : 'cancelled'}>
                                                {customerData.customer?.status?.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Orders</p>
                                        <p className="text-xl font-bold text-gray-800">{customerData.stats?.totalOrders || 0}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Spent</p>
                                        <p className="text-xl font-bold text-gray-800">{formatPrice(customerData.stats?.totalSpend || 0)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Avg. Order</p>
                                        <p className="text-xl font-bold text-gray-800">{formatPrice(customerData.stats?.avgOrderValue || 0)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Order</p>
                                        <p className="text-sm font-bold text-gray-800">
                                            {customerData.stats?.lastOrderDate 
                                                ? formatDate(customerData.stats.lastOrderDate)
                                                : 'Never'}
                                        </p>
                                    </div>
                                </div>

                                {/* Recent Orders */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        <FiShoppingBag className="text-primary-600" />
                                        Recent Orders
                                    </h4>
                                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Order ID</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {orders.length > 0 ? (
                                                    orders.map((order) => (
                                                        <tr key={order.id} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3 font-medium text-primary-600">#{order.id}</td>
                                                            <td className="px-4 py-3 text-gray-500">
                                                                {order.date || order.orderDate || order.createdAt 
                                                                    ? formatDateTime(order.date || order.orderDate || order.createdAt)
                                                                    : 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Badge variant={order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' ? 'cancelled' : 'pending'}>
                                                                    {order.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                                                                {formatPrice(order.pricing?.total || order.total)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-400 italic">
                                                            No orders found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500 italic">
                                No customer data found
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors uppercase tracking-wider"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CustomerDetailModal;

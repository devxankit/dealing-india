import { useState, useMemo } from 'react';
import { FiBell, FiCheck, FiX, FiPackage, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Badge from '../../../../shared/components/Badge';
import AnimatedSelect from '../../components/AnimatedSelect';
import { useNotifications } from '../../../../shared/hooks/useNotifications';
import toast from 'react-hot-toast';

const OrderNotifications = () => {
  const [selectedType, setSelectedType] = useState('all');

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    autoFetch: true,
    enableSocket: true,
  });

  // Filter for order-related notifications only
  const orderNotifications = useMemo(() => {
    return notifications.filter((n) =>
      n.type?.includes('order') ||
      n.type === 'payment_success' ||
      n.type === 'payment_failed'
    );
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (selectedType === 'all') return orderNotifications;
    return orderNotifications.filter((notif) => notif.type === selectedType);
  }, [orderNotifications, selectedType]);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      order_placed: FiPackage,
      order_confirmed: FiCheckCircle,
      order_shipped: FiTruck,
      order_delivered: FiCheckCircle,
      order_cancelled: FiXCircle,
      payment_success: FiCheckCircle,
      payment_failed: FiXCircle,
      new_order: FiPackage,
      order_status_change: FiTruck,
    };
    return iconMap[type] || FiBell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      order_placed: 'bg-blue-100 text-blue-600',
      order_confirmed: 'bg-green-100 text-green-600',
      order_shipped: 'bg-purple-100 text-purple-600',
      order_delivered: 'bg-green-100 text-green-600',
      order_cancelled: 'bg-red-100 text-red-600',
      payment_failed: 'bg-yellow-100 text-yellow-600',
      payment_success: 'bg-green-100 text-green-600',
      new_order: 'bg-blue-100 text-blue-600',
      order_status_change: 'bg-purple-100 text-purple-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Order Notifications</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage order-related notifications</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <AnimatedSelect
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'order_placed', label: 'Order Placed' },
              { value: 'new_order', label: 'New Order' },
              { value: 'order_confirmed', label: 'Order Confirmed' },
              { value: 'order_shipped', label: 'Order Shipped' },
              { value: 'order_delivered', label: 'Order Delivered' },
              { value: 'order_cancelled', label: 'Order Cancelled' },
              { value: 'payment_failed', label: 'Payment Failed' },
              { value: 'payment_success', label: 'Payment Success' },
            ]}
            className="min-w-[140px]"
          />
          <div className="flex items-center gap-2 ml-auto">
            {unreadCount > 0 && (
              <Badge variant="warning">{unreadCount} unread</Badge>
            )}
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm whitespace-nowrap disabled:opacity-50"
            >
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading && filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <FiBell className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500">No order notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      <Icon className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                            {notification.orderId && (
                              <span className="text-xs font-medium text-primary-600">
                                {notification.orderId?.orderCode || notification.orderId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <FiCheck />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderNotifications;

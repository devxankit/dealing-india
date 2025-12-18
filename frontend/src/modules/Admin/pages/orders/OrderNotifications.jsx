import { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX, FiSend } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Badge from '../../../../shared/components/Badge';
import AnimatedSelect from '../../components/AnimatedSelect';
// import { formatDateTime } from '../../utils/adminHelpers';

const OrderNotifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'order_placed',
      title: 'New Order Received',
      message: 'Order #ORD-001 has been placed by John Doe',
      orderId: 'ORD-001',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: 'Order #ORD-002 has been cancelled by customer',
      orderId: 'ORD-002',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 3,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: 'Payment for Order #ORD-003 has failed',
      orderId: 'ORD-003',
      read: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);
  const [selectedType, setSelectedType] = useState('all');

  const filteredNotifications = notifications.filter(
    (notif) => selectedType === 'all' || notif.type === selectedType
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    return FiBell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      order_placed: 'bg-blue-100 text-blue-600',
      order_cancelled: 'bg-red-100 text-red-600',
      payment_failed: 'bg-yellow-100 text-yellow-600',
      order_delivered: 'bg-green-100 text-green-600',
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
              { value: 'order_cancelled', label: 'Order Cancelled' },
              { value: 'payment_failed', label: 'Payment Failed' },
              { value: 'order_delivered', label: 'Order Delivered' },
            ]}
            className="min-w-[140px]"
          />
          <div className="flex items-center gap-2 ml-auto">
            {unreadCount > 0 && (
              <Badge variant="warning">{unreadCount} unread</Badge>
            )}
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm whitespace-nowrap"
            >
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <FiBell className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      <Icon className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                            <span className="text-xs font-medium text-primary-600">
                              {notification.orderId}
                            </span>
                          </div>
                        </div>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <FiCheck />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
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


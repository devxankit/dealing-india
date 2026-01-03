import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiSearch, FiCheck, FiX, FiArrowLeft, FiPackage, FiTruck, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from "../../../shared/components/PageTransition";
import ProtectedRoute from "../../../shared/components/Auth/ProtectedRoute";
import { useAuthStore } from "../../../shared/store/authStore";
import { useNotifications } from "../../../shared/hooks/useNotifications";
import Badge from "../../../shared/components/Badge";
import toast from "react-hot-toast";

const Notifications = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateFilters,
  } = useNotifications({
    autoFetch: isAuthenticated,
    enableSocket: isAuthenticated,
  });

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (searchQuery) {
      filtered = filtered.filter(
        (notif) =>
          notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notif.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((notif) => notif.type === typeFilter);
    }

    if (readFilter !== "all") {
      filtered = filtered.filter((notif) =>
        readFilter === "read" ? notif.isRead : !notif.isRead
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [notifications, searchQuery, typeFilter, readFilter]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.orderId) {
      const orderId = notification.orderId._id || notification.orderId;
      navigate(`/app/orders/${orderId}`);
    }
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      order_placed: "Order Placed",
      order_confirmed: "Order Confirmed",
      order_shipped: "Order Shipped",
      order_delivered: "Order Delivered",
      order_cancelled: "Order Cancelled",
      payment_success: "Payment Success",
      payment_failed: "Payment Failed",
      offer: "Offer",
      promotion: "Promotion",
      system: "System",
      new_order: "New Order",
      order_status_change: "Order Update",
      return_request: "Return Request",
      review: "Review",
    };
    return typeMap[type] || type;
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
      offer: FiBell,
      promotion: FiBell,
      system: FiBell,
      new_order: FiPackage,
      order_status_change: FiTruck,
      return_request: FiPackage,
      review: FiCheckCircle,
    };
    return iconMap[type] || FiBell;
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      order_placed: "bg-blue-100 text-blue-600",
      order_confirmed: "bg-green-100 text-green-600",
      order_shipped: "bg-purple-100 text-purple-600",
      order_delivered: "bg-green-100 text-green-600",
      order_cancelled: "bg-red-100 text-red-600",
      payment_success: "bg-green-100 text-green-600",
      payment_failed: "bg-red-100 text-red-600",
      offer: "bg-orange-100 text-orange-600",
      promotion: "bg-pink-100 text-pink-600",
      system: "bg-gray-100 text-gray-600",
      new_order: "bg-blue-100 text-blue-600",
      order_status_change: "bg-purple-100 text-purple-600",
      return_request: "bg-yellow-100 text-yellow-600",
      review: "bg-green-100 text-green-600",
    };
    return colorMap[type] || "bg-gray-100 text-gray-600";
  };

  if (!user?.id || !isAuthenticated) {
    return (
      <ProtectedRoute>
        <MobileLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Please log in to view notifications</p>
          </div>
        </MobileLayout>
      </ProtectedRoute>
    );
  }

  return (
    <PageTransition>
      <ProtectedRoute>
        <MobileLayout>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiArrowLeft className="text-xl text-gray-700" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FiBell className="text-primary-600" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="warning" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Stay updated with your orders and offers
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm disabled:opacity-50">
                  <FiCheck className="inline mr-1" />
                  Mark All Read
                </button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-800">
                  {notifications.length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Unread</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {unreadCount}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Read</p>
                <p className="text-2xl font-bold text-green-600">
                  {notifications.length - unreadCount}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Orders</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    notifications.filter(
                      (n) =>
                        n.type?.includes("order") || n.type === "order_placed" || n.type === "new_order"
                    ).length
                  }
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notifications..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                    <option value="all">All Types</option>
                    <option value="order_placed">Order Placed</option>
                    <option value="order_shipped">Order Shipped</option>
                    <option value="order_delivered">Order Delivered</option>
                    <option value="order_cancelled">Order Cancelled</option>
                    <option value="payment_success">Payment</option>
                    <option value="offer">Offers</option>
                    <option value="system">System</option>
                  </select>

                  <select
                    value={readFilter}
                    onChange={(e) => setReadFilter(e.target.value)}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && notifications.length === 0 && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            )}

            {/* Notifications List */}
            {!loading && filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md ${
                        !notification.isRead ? "bg-blue-50/50 border-blue-200" : ""
                      }`}>
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getNotificationColor(
                            notification.type
                          )}`}>
                          <Icon className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-semibold text-gray-800 ${!notification.isRead ? "font-bold" : ""}`}>
                                  {notification.title || getTypeLabel(notification.type)}
                                </h3>
                                {!notification.isRead && (
                                  <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>
                                  {new Date(notification.createdAt).toLocaleString()}
                                </span>
                                {notification.orderId && (
                                  <span className="font-medium text-primary-600">
                                    Order #{notification.orderId?.orderCode || notification.orderId}
                                  </span>
                                )}
                                <Badge variant="info" className="text-xs">
                                  {getTypeLabel(notification.type)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(notification._id);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark as Read">
                              <FiCheck className="text-sm" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification._id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete">
                            <FiX className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : !loading ? (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
                <FiBell className="mx-auto text-5xl text-gray-400 mb-4" />
                <p className="text-gray-500 font-medium text-lg">No notifications found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery || typeFilter !== "all" || readFilter !== "all"
                    ? "Try adjusting your filters"
                    : "You're all caught up! Check back later for updates."}
                </p>
              </div>
            ) : null}
          </motion.div>
        </MobileLayout>
      </ProtectedRoute>
    </PageTransition>
  );
};

export default Notifications;

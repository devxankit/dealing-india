import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheck, FiArrowLeft, FiMoreVertical, FiTrash2 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from "../../../shared/components/PageTransition";
import ProtectedRoute from "../../../shared/components/Auth/ProtectedRoute";
import { useAuthStore } from "../../../shared/store/authStore";
import { useNotifications } from "../../../shared/hooks/useNotifications";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const Notifications = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [filter, setFilter] = useState("all"); // all, unread

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    autoFetch: isAuthenticated,
    enableSocket: isAuthenticated,
  });

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    }
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, filter]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.orderId) {
      const orderId = notification.orderId._id || notification.orderId;
      navigate(`/app/orders/${orderId}`);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      toast.success("Removed");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (!user?.id || !isAuthenticated) {
    return (
      <ProtectedRoute>
        <MobileLayout>
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
            <FiBell className="text-4xl text-gray-300 mb-4" />
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
          <div className="bg-white min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
              <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(-1)} className="p-1 -ml-2 text-gray-800">
                    <FiArrowLeft className="text-xl" />
                  </button>
                  <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Minimal Filter Tabs */}
              <div className="px-4 pb-2 flex gap-4 text-sm font-medium border-b border-gray-50">
                <button
                  onClick={() => setFilter("all")}
                  className={`pb-2 relative ${filter === "all" ? "text-primary-600" : "text-gray-500"
                    }`}
                >
                  All
                  {filter === "all" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full"
                    />
                  )}
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`pb-2 relative ${filter === "unread" ? "text-primary-600" : "text-gray-500"
                    }`}
                >
                  Unread
                  {filter === "unread" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full"
                    />
                  )}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-w-md mx-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <ul className="divide-y divide-gray-50">
                  <AnimatePresence initial={false}>
                    {filteredNotifications.map((notification) => (
                      <motion.li
                        key={notification._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`relative p-4 flex gap-3 transition-colors active:bg-gray-50 ${!notification.isRead ? "bg-blue-50/30" : "bg-white"
                          }`}
                      >
                        {/* Dot Indicator for Unread */}
                        {!notification.isRead && (
                          <div className="absolute left-2 top-6 w-1.5 h-1.5 bg-primary-500 rounded-full shadow-sm" />
                        )}

                        {/* Icon / Avatar placeholder */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${!notification.isRead ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-500"
                          }`}>
                          {notification.type.includes('order') ? <FiBell /> : <FiBell />}
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <p className={`text-sm ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-900"}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              {dayjs(notification.createdAt).fromNow(true)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-snug line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        {/* Delete Action (Top Right absolute or inline) */}
                        <button
                          onClick={(e) => handleDelete(e, notification._id)}
                          className="absolute right-2 top-4 p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <FiBell className="text-2xl text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">No notifications</h3>
                  <p className="text-sm text-gray-500">We'll notify you when something important happens.</p>
                </div>
              )}
            </div>
          </div>
        </MobileLayout>
      </ProtectedRoute>
    </PageTransition>
  );
};

export default Notifications;

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications as fetchNotifications,
  getUnreadCount as fetchUnreadCount,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead,
  deleteNotification as deleteNotificationById,
} from '../services/notificationService';
import { initializeSocket, getSocket, disconnectSocket } from '../utils/socket';

/**
 * Custom hook for managing notifications with real-time updates
 * @param {Object} options - Hook options
 * @param {Boolean} options.autoFetch - Auto-fetch notifications on mount (default: true)
 * @param {Object} options.filters - Initial filters for notifications
 * @param {Boolean} options.enableSocket - Enable socket.io real-time updates (default: true)
 * @returns {Object} Notification state and methods
 */
export const useNotifications = (options = {}) => {
  const {
    autoFetch = true,
    filters: initialFilters = {},
    enableSocket = true,
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const socketInitialized = useRef(false);
  const filtersRef = useRef(initialFilters);

  // Get appropriate token based on current route
  const getToken = () => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      return localStorage.getItem('admin-token');
    } else if (path.startsWith('/b2b-vendor')) {
      return localStorage.getItem('b2b-vendor-token');
    } else if (path.startsWith('/vendor')) {
      return localStorage.getItem('vendor-token');
    }
    return localStorage.getItem('token');
  };

  // Initialize socket connection
  useEffect(() => {
    if (!enableSocket) return;

    const token = getToken();
    if (!token) return;

    if (!socketInitialized.current) {
      const socket = initializeSocket(token);
      if (!socket) {
        // No token or socket initialization failed, skip socket setup
        return;
      }
      socketInitialized.current = true;

      // Listen for new notifications
      socket.on('new_notification', (notification) => {
        setNotifications((prev) => {
          // Check if notification already exists (prevent duplicates)
          const exists = prev.some((n) => n._id === notification._id);
          if (exists) return prev;
          // Add new notification at the beginning
          return [notification, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      });

      // Listen for notification read updates
      socket.on('notification_read', ({ notificationId, isRead }) => {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead, readAt: new Date() } : n
          )
        );
        if (isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      });

      // Listen for all notifications read
      socket.on('all_notifications_read', ({ count }) => {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
        );
        setUnreadCount(0);
      });

      // Listen for notification deleted
      socket.on('notification_deleted', ({ notificationId }) => {
        setNotifications((prev) => {
          const notification = prev.find((n) => n._id === notificationId);
          const wasUnread = notification && !notification.isRead;
          const updated = prev.filter((n) => n._id !== notificationId);
          if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          return updated;
        });
      });

      // Listen for read notifications deleted
      socket.on('read_notifications_deleted', () => {
        // Refetch notifications to get updated list
        fetchNotificationsList();
      });
    }

    return () => {
      // Don't disconnect socket here as it might be used by other components
      // Socket will be cleaned up on app unmount or logout
    };
  }, [enableSocket]);

  // Fetch notifications list
  const fetchNotificationsList = useCallback(async (customFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const mergedFilters = { ...filtersRef.current, ...customFilters };
      const result = await fetchNotifications(mergedFilters);
      setNotifications(result.notifications || []);
      setPagination(result.pagination || pagination);
    } catch (err) {
      // Silently handle network errors (backend might not be running)
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        console.warn('Backend server not available. Using empty notifications list.');
        setNotifications([]);
        setError(null); // Don't show error for network issues
      } else {
        setError(err.message || 'Failed to fetch notifications');
        console.error('Error fetching notifications:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCountValue = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // Silently handle network errors (backend might not be running)
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        console.warn('Backend server not available. Unread count will be 0.');
        setUnreadCount(0);
      } else {
        console.error('Error fetching unread count:', err);
      }
      // Don't set error for unread count as it's a background operation
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteNotificationById(notificationId);
      setNotifications((prev) => {
        const notification = prev.find((n) => n._id === notificationId);
        const wasUnread = notification && !notification.isRead;
        const updated = prev.filter((n) => n._id !== notificationId);
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        return updated;
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    filtersRef.current = { ...filtersRef.current, ...newFilters };
    fetchNotificationsList(newFilters);
  }, [fetchNotificationsList]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchNotificationsList();
      fetchUnreadCountValue();
    }
  }, [autoFetch, fetchNotificationsList, fetchUnreadCountValue]);

  // Poll for unread count updates (fallback if socket disconnected)
  useEffect(() => {
    if (!enableSocket) return;

    const interval = setInterval(() => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        // Socket disconnected, poll for updates
        fetchUnreadCountValue();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [enableSocket, fetchUnreadCountValue]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications: fetchNotificationsList,
    fetchUnreadCount: fetchUnreadCountValue,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateFilters,
    refetch: () => {
      fetchNotificationsList();
      fetchUnreadCountValue();
    },
  };
};


import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '../controllers/user-controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require authentication and user role
router.use(authenticate);
router.use(authorize('user'));

// Get notifications
router.get('/', asyncHandler(getNotifications));

// Get unread count
router.get('/unread-count', asyncHandler(getUnreadCount));

// Mark notification as read
router.put('/:id/read', asyncHandler(markAsRead));

// Mark all notifications as read
router.put('/read-all', asyncHandler(markAllAsRead));

// Delete notification
router.delete('/:id', asyncHandler(deleteNotification));

// Delete all read notifications
router.delete('/read-all', asyncHandler(deleteAllRead));

export default router;


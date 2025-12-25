import express from 'express';
import { login, logout, getMe } from '../controllers/admin-controllers/adminAuth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes
router.post('/login', asyncHandler(login));

// Protected routes (require authentication and admin role)
router.post('/logout', authenticate, authorize('admin'), asyncHandler(logout));
router.get('/me', authenticate, authorize('admin'), asyncHandler(getMe));

export default router;


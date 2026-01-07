import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  verifyEmail,
  resendOTP,
  forgotPassword,
  resetPassword,
} from '../controllers/user-controllers/userAuth.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import { rateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', rateLimiter('register', 5, 600), asyncHandler(register));
router.post('/login', rateLimiter('login', 10, 600), asyncHandler(login));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-otp', rateLimiter('otp-resend', 5, 600), asyncHandler(resendOTP));
router.post('/forgot-password', rateLimiter('forgot-password', 5, 600), asyncHandler(forgotPassword));
router.post('/reset-password', rateLimiter('reset-password', 5, 600), asyncHandler(resetPassword));

// Protected routes (require authentication)
// Logout uses optional authentication to allow logout even with expired tokens
router.post('/logout', optionalAuthenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(getMe));
router.put('/profile', authenticate, asyncHandler(updateProfile));
router.put('/change-password', authenticate, asyncHandler(changePassword));

export default router;


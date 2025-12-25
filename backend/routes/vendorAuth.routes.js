import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  verifyEmail,
  resendOTP,
  forgotPassword,
  resetPassword,
} from '../controllers/vendor-controllers/vendorAuth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-otp', asyncHandler(resendOTP));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));

// Protected routes (require authentication)
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, vendorApproved, asyncHandler(getMe));
router.put('/profile', authenticate, vendorApproved, asyncHandler(updateProfile));

export default router;


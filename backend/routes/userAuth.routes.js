import express from 'express';
import {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    getMe,
    updateProfile,
    verifyEmail,
    resendOTP,
    getAddresses,
    addAddress
} from '../controllers/userAuth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/addresses', authenticate, getAddresses);
router.post('/addresses', authenticate, addAddress);

export default router;

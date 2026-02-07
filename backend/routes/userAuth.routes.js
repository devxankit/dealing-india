import express from 'express';
import {
    register,
    login,
    getMe,
    updateProfile,
    verifyEmail,
    resendOTP
} from '../controllers/userAuth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;

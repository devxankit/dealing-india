import {
    registerUser,
    loginUser,
    getUserById,
    updateUserProfile,
    verifyUserEmail,
    resendUserVerificationOTP,
    getUserAddresses,
    addUserAddress,
    forgotUserPassword,
    resetUserPassword
} from '../services/userAuth.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Register a new user
 * POST /api/auth/user/register
 */
export const register = asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    res.status(201).json({
        success: true,
        message: result.message,
        data: { email: result.email }
    });
});

/**
 * Login user
 * POST /api/auth/user/login
 */
export const login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email/phone and password'
        });
    }

    try {
        const result = await loginUser(identifier, password);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
            return res.status(403).json({
                success: false,
                message: error.message,
                code: error.code,
                data: { email: error.email }
            });
        }
        throw error;
    }
});


/**
 * Logout user
 * POST /api/auth/user/logout
 */
export const logout = asyncHandler(async (req, res) => {
    // In a stateless JWT setup, we can't really "logout" on the server side without a blacklist.
    // But we can return success so the frontend can clear its client-side state.
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * Get current user
 * GET /api/auth/user/me
 */
export const getMe = asyncHandler(async (req, res) => {
    const user = await getUserById(req.user.id);
    res.status(200).json({
        success: true,
        data: { user }
    });
});

/**
 * Update user profile
 * PUT /api/auth/user/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const user = await updateUserProfile(req.user.id, req.body);
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
    });
});

/**
 * Verify email
 * POST /api/auth/user/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const result = await verifyUserEmail(email, otp);
    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: result
    });
});

/**
 * Resend OTP
 * POST /api/auth/user/resend-otp
 */
export const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await resendUserVerificationOTP(email);
    res.status(200).json({
        success: true,
        message: result.message
    });
});

/**
 * Get user addresses
 * GET /api/user/addresses
 */
export const getAddresses = asyncHandler(async (req, res) => {
    const addresses = await getUserAddresses(req.user.id);
    res.status(200).json({
        success: true,
        data: addresses
    });
});

/**
 * Add user address
 * POST /api/user/addresses
 */
export const addAddress = asyncHandler(async (req, res) => {
    const addresses = await addUserAddress(req.user.id, req.body);
    res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: addresses
    });
});

/**
 * Forgot Password
 * POST /api/auth/user/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await forgotUserPassword(email);
    res.status(200).json({
        success: true,
        message: 'Password reset OTP sent to your email',
        data: {
            email,
            // For dev ease, we can include OTP here if needed, or remove before prod
            // otp: result.otp 
        }
    });
});

/**
 * Reset Password
 * POST /api/auth/user/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    await resetUserPassword(email, otp, newPassword);
    res.status(200).json({
        success: true,
        message: 'Password reset successfully'
    });
});

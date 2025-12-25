import {
  registerVendor,
  loginVendor,
  getVendorById,
  updateVendorProfile,
  verifyVendorEmail,
  resendVendorVerificationOTP,
  forgotVendorPassword,
  resetVendorPassword,
} from '../../services/vendorAuth.service.js';

/**
 * Register a new vendor
 * POST /api/auth/vendor/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, storeName, storeDescription, address } = req.body;

    const result = await registerVendor({
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
    });

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully. Please verify your email and wait for admin approval.',
      data: {
        vendor: result.vendor,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login vendor
 * POST /api/auth/vendor/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginVendor(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        vendor: result.vendor,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout vendor
 * POST /api/auth/vendor/logout
 */
export const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged-in vendor
 * GET /api/auth/vendor/me
 */
export const getMe = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const vendor = await getVendorById(vendorId);

    res.status(200).json({
      success: true,
      message: 'Vendor retrieved successfully',
      data: { vendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor profile
 * PUT /api/auth/vendor/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const updateData = req.body;

    const updatedVendor = await updateVendorProfile(vendorId, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { vendor: updatedVendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify vendor email with OTP
 * POST /api/auth/vendor/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    await verifyVendorEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification OTP
 * POST /api/auth/vendor/resend-otp
 */
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await resendVendorVerificationOTP(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset (sends OTP)
 * POST /api/auth/vendor/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await forgotVendorPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP
 * POST /api/auth/vendor/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    await resetVendorPassword(email, otp, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};


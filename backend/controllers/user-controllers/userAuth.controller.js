import {
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
  changeUserPassword,
  verifyUserEmail,
  resendUserVerificationOTP,
  forgotUserPassword,
  resetUserPassword,
} from '../../services/userAuth.service.js';

/**
 * Register a new user
 * POST /api/auth/user/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const result = await registerUser({ name, email, password, phone });

    res.status(201).json({
      success: true,
      message: result.message || 'Registration initiated. Please verify your email to complete registration.',
      data: {
        email: result.email,
      },
    });
  } catch (error) {
    // Handle rate limit errors specifically
    if (error.statusCode === 429 || error.isRateLimitError || error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message || 'Too many OTP requests. Please wait before trying again.',
      });
    }
    
    console.error('❌ Error in register controller:', {
      message: error.message,
      name: error.name,
      status: error.status || error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      body: req.body ? { name: req.body.name, email: req.body.email } : undefined,
    });
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/user/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone

    const result = await loginUser(identifier, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side token removal, backend can invalidate if needed)
 * POST /api/auth/user/logout
 */
export const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // If you need server-side logout, implement token blacklisting here
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged-in user
 * GET /api/auth/user/me
 */
export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await getUserById(userId);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/auth/user/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    const updatedUser = await updateUserProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 * PUT /api/auth/user/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    await changeUserPassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify user email with OTP
 * POST /api/auth/user/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyUserEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Account created.',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification OTP
 * POST /api/auth/user/resend-otp
 */
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await resendUserVerificationOTP(email);

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
 * POST /api/auth/user/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await forgotUserPassword(email);

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
 * POST /api/auth/user/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    await resetUserPassword(email, otp, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};


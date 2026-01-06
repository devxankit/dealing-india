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
    
    // Log detailed error for production debugging
    console.error('❌ Error in register controller:', {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status || error.statusCode,
      stack: error.stack, // Always log stack for production debugging
      body: req.body ? { 
        name: req.body.name, 
        email: req.body.email,
        hasPhone: !!req.body.phone 
      } : undefined,
      timestamp: new Date().toISOString(),
    });
    
    // Provide user-friendly error messages
    let userMessage = error.message || 'Registration failed. Please try again.';
    let statusCode = error.status || error.statusCode || 500;
    
    // Map common errors to user-friendly messages
    if (error.message?.includes('Database connection')) {
      userMessage = 'Service temporarily unavailable. Please try again in a moment.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('Registration service unavailable')) {
      userMessage = 'Registration service is temporarily unavailable. Please try again later.';
      statusCode = 503;
    } else if (error.message?.includes('Email already registered')) {
      statusCode = 409; // Conflict
    } else if (error.message?.includes('Invalid email') || error.message?.includes('Invalid phone')) {
      statusCode = 400; // Bad Request
    }
    
    // Return error with appropriate status code
    return res.status(statusCode).json({
      success: false,
      message: userMessage,
    });
  }
};

/**
 * Login user
 * POST /api/auth/user/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/phone and password are required',
      });
    }

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
    // Preserve status code from service
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Login failed. Please check your credentials.';
    
    // Don't pass to next() if we can handle it here
    return res.status(statusCode).json({
      success: false,
      message,
    });
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


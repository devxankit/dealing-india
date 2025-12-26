import User from '../models/User.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { generateOTP, verifyOTP, resendOTP } from './otp.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { isValidEmail, isValidPhone, validatePassword } from '../utils/validators.util.js';

/**
 * Register a new user
 * @param {Object} userData - { name, email, password, phone }
 * @returns {Promise<Object>} { user, token }
 */
export const registerUser = async (userData) => {
  try {
    const { name, email, password, phone } = userData;

    // Validate inputs
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (phone && !isValidPhone(phone)) {
      throw new Error('Invalid phone number format');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      if (phone && existingUser.phone === phone) {
        throw new Error('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone ? phone.trim() : undefined,
      isEmailVerified: false,
      isActive: true,
      role: 'user',
    });

    // Generate and send verification OTP
    try {
      const otp = await generateOTP(email, 'email_verification');
      await sendVerificationEmail(email, otp);
    } catch (otpError) {
      // Log error but don't fail registration
      console.error('Failed to send verification OTP:', otpError.message);
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login user with email/phone and password
 * @param {String} identifier - Email or phone number
 * @param {String} password - Plain text password
 * @returns {Promise<Object>} { user, token }
 */
export const loginUser = async (identifier, password) => {
  try {
    if (!identifier || !password) {
      throw new Error('Email/phone and password are required');
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    }).select('+password'); // Include password field

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} User object
 */
export const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {String} userId - User ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated user
 */
export const updateUserProfile = async (userId, updateData) => {
  try {
    const { name, phone, avatar } = updateData;
    const updateFields = {};

    if (name) {
      updateFields.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        throw new Error('Invalid phone number format');
      }
      // Check if phone is already taken by another user
      if (phone) {
        const existingUser = await User.findOne({
          phone,
          _id: { $ne: userId },
        });
        if (existingUser) {
          throw new Error('Phone number already in use');
        }
      }
      updateFields.phone = phone ? phone.trim() : null;
    }

    if (avatar !== undefined) {
      updateFields.avatar = avatar;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Change user password
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Promise<Boolean>} Success status
 */
export const changeUserPassword = async (userId, currentPassword, newPassword) => {
  try {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify user email with OTP
 * @param {String} email - User email
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Boolean>} Success status
 */
export const verifyUserEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // Verify OTP
    await verifyOTP(email, otp, 'email_verification');

    // Update user email verification status
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isEmailVerified: true },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Resend verification OTP
 * @param {String} email - User email
 * @returns {Promise<Object>} Success status
 */
export const resendUserVerificationOTP = async (email) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email is required');
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // Generate and send OTP
    const otp = await resendOTP(email, 'email_verification');
    await sendVerificationEmail(email, otp);

    return { success: true, message: 'Verification OTP sent successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Request password reset (sends OTP)
 * @param {String} email - User email
 * @returns {Promise<Object>} Success status
 */
export const forgotUserPassword = async (email) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email is required');
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('No account found with this email address');
    }

    // Generate and send OTP
    const otp = await generateOTP(email, 'password_reset');
    await sendPasswordResetEmail(email, otp);

    return { success: true, message: 'Password reset OTP has been sent to your email' };
  } catch (error) {
    throw error;
  }
};

/**
 * Reset password with OTP
 * @param {String} email - User email
 * @param {String} otp - 4-digit OTP code
 * @param {String} newPassword - New password
 * @returns {Promise<Boolean>} Success status
 */
export const resetUserPassword = async (email, otp, newPassword) => {
  try {
    if (!email || !otp || !newPassword) {
      throw new Error('Email, OTP, and new password are required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Verify OTP
    await verifyOTP(email, otp, 'password_reset');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return true;
  } catch (error) {
    throw error;
  }
};


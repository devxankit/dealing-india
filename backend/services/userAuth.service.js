import mongoose from 'mongoose';
import User from '../models/User.model.js';
import TemporaryRegistration from '../models/TemporaryRegistration.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { generateOTP, verifyOTP, resendOTP } from './otp.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { isValidEmail, isValidPhone, validatePassword } from '../utils/validators.util.js';

/**
 * Register a new user (temporary - only creates record after email verification)
 * @param {Object} userData - { name, email, password, phone }
 * @returns {Promise<Object>} { message, email }
 */
export const registerUser = async (userData) => {
  try {
    // Check database connection with better error handling
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      const stateMessages = {
        0: 'disconnected',
        2: 'connecting',
        3: 'disconnecting',
      };
      const stateMessage = stateMessages[dbState] || 'unknown';
      console.error(`❌ Database connection state: ${stateMessage} (${dbState})`);
      throw new Error(`Database connection not available (${stateMessage}). Please try again later.`);
    }

    // Verify TemporaryRegistration model is available
    if (!TemporaryRegistration) {
      console.error('❌ TemporaryRegistration model is null or undefined');
      throw new Error('Registration service unavailable. Please try again later.');
    }
    
    if (typeof TemporaryRegistration.create !== 'function') {
      console.error('❌ TemporaryRegistration.create is not a function');
      throw new Error('Registration service unavailable. Please try again later.');
    }

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

    // Check if user already exists in database
    let existingUser = null;
    try {
      existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
      });
    } catch (dbError) {
      console.error('❌ Error checking existing user:', {
        message: dbError.message,
        name: dbError.name,
        code: dbError.code,
      });
      throw new Error('Database error. Please try again later.');
    }

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }
      if (phone && existingUser.phone === phone) {
        const error = new Error('Phone number already registered');
        error.statusCode = 409;
        throw error;
      }
    }

    // Check if there's already a pending temporary registration
    let existingTempReg = null;
    try {
      // Ensure TemporaryRegistration model is available
      if (!TemporaryRegistration) {
        throw new Error('TemporaryRegistration model is not available');
      }
      
      existingTempReg = await TemporaryRegistration.findOne({
        email: email.toLowerCase(),
        registrationType: 'user',
        isVerified: false,
        expiresAt: { $gt: new Date() },
      });
    } catch (tempRegError) {
      console.error('❌ Error checking temporary registration:', {
        message: tempRegError.message,
        name: tempRegError.name,
        code: tempRegError.code,
        stack: process.env.NODE_ENV === 'development' ? tempRegError.stack : undefined,
      });
      // If it's a critical error (not just "not found"), throw it
      if (tempRegError.message.includes('model is not available') || 
          tempRegError.message.includes('Cannot read property') ||
          tempRegError.name === 'TypeError') {
        throw new Error('Database service unavailable. Please try again later.');
      }
      // Continue - might be first time or collection doesn't exist yet
    }

    if (existingTempReg) {
      // Delete old temporary registration
      try {
        await TemporaryRegistration.deleteOne({ _id: existingTempReg._id });
      } catch (deleteError) {
        console.error('Error deleting old temporary registration:', deleteError.message);
        // Continue - will create new one
      }
    }

    // Store registration data temporarily (expires in 15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    // Create temporary registration
    let tempReg = null;
    try {
      // Ensure TemporaryRegistration model is available
      if (!TemporaryRegistration) {
        throw new Error('TemporaryRegistration model is not available');
      }

      // Validate required fields before creating
      const tempRegData = {
        email: email.toLowerCase().trim(),
        registrationType: 'user',
        registrationData: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword, // Store hashed password
          phone: phone ? phone.trim() : undefined,
        },
        expiresAt,
        isVerified: false,
      };

      // Validate data
      if (!tempRegData.email || !tempRegData.registrationData.name || !tempRegData.registrationData.password) {
        throw new Error('Missing required registration data');
      }

      // Double check database connection before creating
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection lost. Please try again.');
      }

      tempReg = await TemporaryRegistration.create(tempRegData);
      
      if (!tempReg || !tempReg._id) {
        throw new Error('Failed to create temporary registration record');
      }
    } catch (createError) {
      console.error('❌ Error creating temporary registration:', {
        message: createError.message,
        name: createError.name,
        code: createError.code,
        keyPattern: createError.keyPattern,
        keyValue: createError.keyValue,
        stack: process.env.NODE_ENV === 'development' ? createError.stack : undefined,
      });
      
      // Provide more specific error messages
      if (createError.name === 'ValidationError') {
        const validationErrors = Object.values(createError.errors || {}).map(e => e.message).join(', ');
        throw new Error(`Validation error: ${validationErrors}`);
      } else if (createError.code === 11000) {
        // Duplicate key error
        throw new Error('Registration already in progress. Please check your email for verification code.');
      } else if (createError.message.includes('model is not available')) {
        throw new Error('Database service unavailable. Please try again later.');
      } else {
        throw new Error(`Failed to initiate registration: ${createError.message}`);
      }
    }

    // Generate and send verification OTP
    let otp;
    try {
      otp = await generateOTP(email, 'email_verification');
    } catch (otpError) {
      // If it's a rate limit error, throw it with proper status
      if (otpError.isRateLimitError || otpError.statusCode === 429) {
        otpError.status = 429;
        throw otpError;
      }
      // For other OTP errors, throw with 400 status
      otpError.status = 400;
      throw otpError;
    }
    
    // Send verification email
    let emailResult;
    try {
      emailResult = await sendVerificationEmail(email, otp);
    } catch (emailError) {
      console.error('❌ Error in sendVerificationEmail:', {
        message: emailError.message,
        name: emailError.name,
        stack: emailError.stack,
      });
      
      // If email fails, delete temporary registration
      try {
        if (tempReg && tempReg._id) {
          await TemporaryRegistration.deleteOne({ _id: tempReg._id });
        } else {
          await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
        }
      } catch (deleteError) {
        console.error('Error deleting temporary registration after email failure:', deleteError.message);
      }
      
      // If email service is not configured, still allow registration but log OTP
      if (emailError.message?.includes('not configured') || emailError.message?.includes('EMAIL_SERVICE_NOT_CONFIGURED')) {
        console.error(`🚨 CRITICAL: Email service not configured. OTP for ${email}: ${otp}`);
        throw new Error('Email service not configured. Please contact support.');
      }
      
      throw new Error('Failed to send verification email. Please try again.');
    }

    if (!emailResult || !emailResult.success) {
      // If email fails, delete temporary registration
      try {
        if (tempReg && tempReg._id) {
          await TemporaryRegistration.deleteOne({ _id: tempReg._id });
        } else {
          await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
        }
      } catch (deleteError) {
        console.error('Error deleting temporary registration after email failure:', deleteError.message);
      }
      
      const errorMessage = emailResult?.message || 'Failed to send verification email. Please try again.';
      throw new Error(errorMessage);
    }

    console.log(`✅ Verification OTP sent to ${email}`);

    // Return only email - no user or token until verified
    return {
      message: 'Registration initiated. Please verify your email to complete registration.',
      email: email.toLowerCase(),
    };
  } catch (error) {
    // Enhanced error logging for debugging (always log in production for debugging)
    console.error('❌ Error in registerUser:', {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      isRateLimitError: error.isRateLimitError,
      dbState: mongoose.connection?.readyState,
      hasTempRegModel: !!TemporaryRegistration,
      stack: error.stack, // Always log stack in production for debugging
    });
    
    // Preserve status codes for rate limiting
    if (error.statusCode === 429 || error.isRateLimitError) {
      error.status = 429;
    }
    
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
 * Verify user email with OTP and create actual user account
 * @param {String} email - User email
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Object>} { user, token }
 */
export const verifyUserEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // Verify OTP first
    await verifyOTP(email, otp, 'email_verification');

    // Find temporary registration
    const tempRegistration = await TemporaryRegistration.findOne({
      email: email.toLowerCase(),
      registrationType: 'user',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tempRegistration) {
      throw new Error('Registration session expired or not found. Please register again.');
    }

    // Check if user already exists (edge case - might have been created somehow)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Delete temporary registration
      await TemporaryRegistration.deleteOne({ _id: tempRegistration._id });
      throw new Error('User already exists');
    }

    // Create actual user in database
    const user = await User.create({
      name: tempRegistration.registrationData.name,
      email: tempRegistration.registrationData.email,
      password: tempRegistration.registrationData.password, // Already hashed
      phone: tempRegistration.registrationData.phone,
      isEmailVerified: true, // Set to true since OTP is verified
      isActive: true,
      role: 'user',
    });

    // Mark temporary registration as verified and delete it
    await TemporaryRegistration.deleteOne({ _id: tempRegistration._id });

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    console.log(`✅ User account created and verified for ${email}`);

    return {
      user: userObj,
      token,
    };
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

    // Check if temporary registration exists
    const tempRegistration = await TemporaryRegistration.findOne({
      email: email.toLowerCase(),
      registrationType: 'user',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tempRegistration) {
      // Check if user already exists and is verified
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        if (user.isEmailVerified) {
          throw new Error('Email is already verified');
        }
        throw new Error('Registration session expired. Please register again.');
      }
      throw new Error('No pending registration found. Please register again.');
    }

    // Generate and send OTP (async, don't block response)
    const otp = await resendOTP(email, 'email_verification');
    
    // Send email asynchronously to avoid blocking
    sendVerificationEmail(email, otp)
      .then(result => {
        if (result.success) {
          console.log(`✅ Verification OTP resent to ${email}`);
        } else {
          // Enhanced error logging
          console.error(`❌ OTP generated but email failed for ${email}:`, result.message);
          if (result.error) {
            console.error(`   Error: ${result.error}`);
          }
          if (result.errorCode) {
            console.error(`   Error Code: ${result.errorCode}`);
          }
          // Log OTP so admin can manually verify if needed
          if (result.otp) {
            console.log(`   OTP for manual verification: ${result.otp}`);
          }
        }
      })
      .catch(error => {
        console.error('❌ Error sending verification email:', error.message);
        console.error('   Stack:', error.stack);
      });

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
    // Generate and send OTP
    let otp;
    try {
      otp = await generateOTP(email, 'password_reset');
    } catch (otpError) {
      // If it's a rate limit error, throw it with proper status
      if (otpError.isRateLimitError || otpError.statusCode === 429) {
        otpError.status = 429;
        throw otpError;
      }
      // For other OTP errors, throw with 400 status
      otpError.status = 400;
      throw otpError;
    }
    
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


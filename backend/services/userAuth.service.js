import User from '../models/User.model.js';
import TemporaryRegistration from '../models/TemporaryRegistration.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from './email.service.js';
import { generateOTP, verifyOTP } from './otp.service.js';
import notificationService from './notification.service.js';
import {
    ensureReferralCodeForOwner,
    validateReferralCode,
    processSuccessfulUserReferral,
} from './referral.service.js';

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
    const { name, email, password, phone, userType, businessInfo, referralCode, state, language } = userData;
    const normalizedReferralCode = String(referralCode || '').trim().toUpperCase();

    if (normalizedReferralCode) {
        const validReferral = await validateReferralCode(normalizedReferralCode);
        if (!validReferral) {
            throw new Error('Invalid referral code');
        }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        const error = new Error('User with this email already exists');
        error.status = 400;
        throw error;
    }

    // Hash password (uses util with 10 rounds for performance)
    const hashedPassword = await hashPassword(password);
    await TemporaryRegistration.findOneAndUpdate(
        { email, registrationType: 'user' },
        {
            registrationData: {
                name,
                email,
                password: hashedPassword,
                phone,
                currentMarketplace: 'b2b',
                businessInfo,
                role: 'user',
                referralCode: normalizedReferralCode || undefined,
                state: state || undefined,
                language: language || 'English',
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isVerified: false
        },
        { upsert: true, new: true }
    );

    // Generate OTP
    const otp = await generateOTP(email, 'email_verification');

    // FIRE AND FORGET - Don't await email sending to avoid blocking
    sendVerificationEmail(email, otp).catch(e => console.error('BG Email Error:', e.message));

    return {
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        email: email,
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    };
};

/**
 * Verify user email
 */
export const verifyUserEmail = async (email, otp) => {
    const isOTPValid = await verifyOTP(email, otp, 'email_verification');
    if (!isOTPValid) {
        throw new Error('Invalid or expired OTP');
    }

    // Get data from temporary registration
    const tempReg = await TemporaryRegistration.findOne({
        email,
        registrationType: 'user'
    });

    if (!tempReg) {
        // Check if user already exists (maybe already verified)
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isEmailVerified) {
            await ensureReferralCodeForOwner({ userId: existingUser._id, userModel: 'User' });
            // Generate token for already verified user
            const token = generateToken({ id: existingUser._id, role: existingUser.role });
            return { user: existingUser, token };
        }
        throw new Error('Registration data not found or expired');
    }

    const { registrationData } = tempReg;

    // Create the actual user
    const user = await User.create({
        ...registrationData,
        isEmailVerified: true,
        isActive: true
    });

    await ensureReferralCodeForOwner({ userId: user._id, userModel: 'User' });

    if (registrationData?.referralCode) {
        try {
            await processSuccessfulUserReferral({
                referredUserId: user._id,
                referralCode: registrationData.referralCode,
            });
        } catch (referralError) {
            console.error('Referral processing skipped:', referralError.message);
        }
    }

    // Delete temporary registration
    await TemporaryRegistration.deleteOne({ _id: tempReg._id });

    // Send welcome email (Background)
    sendWelcomeEmail(user.email, user.name).catch(e => console.error('BG Email Error:', e.message));

    // Create Welcome Notification in DB
    notificationService.createNotification({
        recipientId: user._id,
        recipientType: 'user',
        type: 'system',
        title: 'Welcome to Dealing India! \uD83D\uDE80',
        message: `Hi ${user.name}, your account is now verified. Start exploring thousands of B2B products and real estate opportunities.`,
        actionUrl: '/b2b/catalog'
    }).catch(e => console.error('Notification Error:', e.message));

    // Generate token
    const token = generateToken({ id: user._id, role: user.role });

    return { user, token };
};

/**
 * Login user
 */
export const loginUser = async (identifier, password) => {
    // Clean identifier (e.g. remove +91 prefix if phone)
    let searchConditions = [
        { email: identifier },
        { phone: identifier }
    ];

    if (identifier.startsWith('+91')) {
        const phoneWithoutPrefix = identifier.replace('+91', '');
        searchConditions.push({ phone: phoneWithoutPrefix });
    } else {
        // Just in case user enters without +91 but DB has +91 (less likely but possible)
        searchConditions.push({ phone: '+91' + identifier });
    }

    // Find user by email or phone (multiple formats)
    const user = await User.findOne({
        $or: searchConditions
    }).select('+password');

    if (!user) {
        throw new Error('user not found please register');
    }

    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch) {
        throw new Error('Invalid credentials');
    }

    if (!user.isEmailVerified) {
        // Generate new OTP and tell them to verify
        const otp = await generateOTP(user.email, 'email_verification');
        sendVerificationEmail(user.email, otp).catch(e => console.error('BG Email Error:', e.message));
        throw {
            message: 'Please verify your email. A new OTP has been sent.',
            code: 'EMAIL_NOT_VERIFIED',
            email: user.email
        };
    }

    // Generate token
    const token = generateToken({ id: user._id, role: user.role });

    return { user, token };
};

/**
 * Get user by ID
 */
export const getUserById = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (id, updateData) => {
    const user = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Notify user about profile update
    notificationService.createNotification({
        recipientId: user._id,
        recipientType: 'user',
        type: 'system',
        title: 'Profile Updated Successfully',
        message: 'Your business profile information has been updated. This helps build trust with sellers.',
        actionUrl: '/b2b/profile'
    }).catch(e => console.error('Notification Error:', e.message));

    return user;
};

/**
 * Resend verification OTP
 */
export const resendUserVerificationOTP = async (email) => {
    // Check if user already exists in main collection
    const user = await User.findOne({ email });
    if (user) {
        if (user.isEmailVerified) {
            throw new Error('Email is already verified');
        }
    } else {
        // Check if user exists in temporary registration
        const tempReg = await TemporaryRegistration.findOne({ email, registrationType: 'user' });
        if (!tempReg) {
            throw new Error('User not found or registration expired');
        }
    }

    const otp = await generateOTP(email, 'email_verification');
    sendVerificationEmail(email, otp).catch(e => console.error('BG Email Error:', e.message));

    return { message: 'Verification OTP resent successfully' };
};

/**
 * Get user addresses
 */
export const getUserAddresses = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user.addresses || [];
};

/**
 * Add user address
 */
export const addUserAddress = async (userId, addressData) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // If this is the first address, make it default
    if (!user.addresses || user.addresses.length === 0) {
        addressData.isDefault = true;
    }

    // If new address is set as default, unset others
    if (addressData.isDefault) {
        if (user.addresses) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }
    }

    user.addresses.push(addressData);
    await user.save();

    return user.addresses;
};

/**
 * Forgot password - Send OTP
 */
export const forgotUserPassword = async (email) => {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
        // We return success to not leak email existence, but log it
        // Or you can throw error as per requirement. User asked "Validate email exists".
        // Let's assume user-facing error IS desired for UX
        throw new Error('User with this email not found');
    }

    const otp = await generateOTP(email, 'password_reset');
    sendPasswordResetEmail(email, otp).catch(e => console.error('BG Email Error:', e.message));

    // Removed await on emailResult, background sending is enough.
    console.log(`Forgot password OTP generated for ${email}: ${otp}`);

    return { message: 'Password reset OTP sent to your email', otp }; // Return OTP for dev purposes if needed, but usually kept secret
};

/**
 * Reset User Password
 */
export const resetUserPassword = async (email, otp, newPassword) => {
    // Verify OTP
    const isOTPValid = await verifyOTP(email, otp, 'password_reset');
    if (!isOTPValid) {
        throw new Error('Invalid or expired OTP');
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    // Hash password (normalized rounds)
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    // Security Notification
    notificationService.createNotification({
        recipientId: user._id,
        recipientType: 'user',
        type: 'system',
        title: 'Security Alert: Password Changed',
        message: 'Your account password was recently changed. If this wasn\'t you, please secure your account immediately.',
    }).catch(e => console.error('Notification Error:', e.message));

    return { message: 'Password reset successfully' };
};

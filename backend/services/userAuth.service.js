import User from '../models/User.model.js';
import TemporaryRegistration from '../models/TemporaryRegistration.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken } from '../utils/jwt.util.js';
import { sendVerificationEmail, sendWelcomeEmail } from './email.service.js';
import { generateOTP, verifyOTP } from './otp.service.js';

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
    const { name, email, password, phone, userType, businessInfo } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save to Temporary Registration instead of main User collection
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
                role: 'user'
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isVerified: false
        },
        { upsert: true, new: true }
    );

    // Generate OTP
    const otp = await generateOTP(email, 'email_verification');

    // Send verification email
    await sendVerificationEmail(email, otp);

    return {
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        email: email
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

    // Delete temporary registration
    await TemporaryRegistration.deleteOne({ _id: tempReg._id });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate token
    const token = generateToken({ id: user._id, role: user.role });

    return { user, token };
};

/**
 * Login user
 */
export const loginUser = async (identifier, password) => {
    // Find user by email or phone
    const user = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }]
    }).select('+password');

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new Error('Invalid credentials');
    }

    if (!user.isEmailVerified) {
        // Generate new OTP and tell them to verify
        const otp = await generateOTP(user.email, 'email_verification');
        await sendVerificationEmail(user.email, otp);
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
    await sendVerificationEmail(email, otp);

    return { message: 'Verification OTP resent successfully' };
};

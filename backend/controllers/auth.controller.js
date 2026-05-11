import SMSOTP from '../models/SMSOTP.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import smsService from '../services/sms.service.js';
import notificationService from '../services/notification.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/bcrypt.util.js';

/**
 * Send OTP to mobile number
 * POST /api/auth/send-otp
 */
export const sendOTP = asyncHandler(async (req, res) => {
    const { phoneNumber, purpose } = req.body;

    if (!phoneNumber || !phoneNumber.startsWith('+91') || phoneNumber.length < 13) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid phone number with country code (+91XXXXXXXXXX)'
        });
    }

    // Rate limiting: Max 5 requests per hour per number
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await SMSOTP.countDocuments({
        phoneNumber,
        createdAt: { $gte: oneHourAgo }
    });

    if (recentRequests >= 5) {
        return res.status(429).json({
            success: false,
            message: 'Too many OTP requests. Please try again after an hour.'
        });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database with purpose
    await SMSOTP.create({
        phoneNumber,
        otp,
        expiresAt,
        purpose: purpose || 'verification'
    });

    // Send SMS via SMS India Hub
    const smsSent = await smsService.sendOTP(phoneNumber, otp);

    if (!smsSent && process.env.NODE_ENV === 'production') {
        return res.status(500).json({
            success: false,
            message: 'Failed to send SMS. Please try again later.'
        });
    }

    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        // Don't expose OTP in production
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
});

/**
 * Verify OTP and authenticate user
 * POST /api/auth/verify-otp
 */
export const verifyOTP = asyncHandler(async (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and OTP are required'
        });
    }

    // Fetch the latest OTP for this phone number
    const storedOtp = await SMSOTP.findOne({ phoneNumber }).sort({ createdAt: -1 });

    if (!storedOtp) {
        return res.status(404).json({
            success: false,
            message: 'OTP not found. Please request a new one.'
        });
    }

    // Check attempts
    if (storedOtp.attempts >= 3) {
        return res.status(403).json({
            success: false,
            message: 'Maximum attempts reached. Please request a new OTP.'
        });
    }

    // Check expiry
    if (new Date() > storedOtp.expiresAt) {
        return res.status(403).json({
            success: false,
            message: 'OTP has expired. Please request a new one.'
        });
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
        storedOtp.attempts += 1;
        await storedOtp.save();
        return res.status(401).json({
            success: false,
            message: `Invalid OTP. ${3 - storedOtp.attempts} attempts remaining.`
        });
    }

    // OTP is valid!
    // Clean up OTPs for this number
    await SMSOTP.deleteMany({ phoneNumber });

    // Check if user exists (either as a regular user or a vendor)
    let profile = await User.findOne({ phone: phoneNumber });
    let role = 'user';

    if (!profile) {
      profile = await Vendor.findOne({ phone: phoneNumber });
      if (profile) {
        role = 'vendor';
      }
    }

    if (!profile) {
      // New user registration flow - this will be handled by the frontend
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Please complete registration.',
        isNewUser: true,
        phoneNumber
      });
    }

    // Mark as verified in both collections if found
    await Promise.all([
      User.updateOne({ phone: phoneNumber }, { $set: { isPhoneVerified: true } }),
      Vendor.updateOne({ phone: phoneNumber }, { $set: { isPhoneVerified: true } })
    ]);

    // Ensure we have the latest profile data for the response
    let updatedProfile = await User.findOne({ phone: phoneNumber });
    let finalRole = 'user';

    if (!updatedProfile) {
      updatedProfile = await Vendor.findOne({ phone: phoneNumber });
      finalRole = 'vendor';

      // If this is a new B2B vendor (just registered and verified), send admin notification
      if (updatedProfile && updatedProfile.vendorType === 'b2b' && updatedProfile.status === 'pending') {
        try {
          await notificationService.sendBulkNotification({
            type: 'vendor_registration',
            title: 'New B2B Vendor Registration - Phone Verified',
            message: `B2B vendor ${updatedProfile.storeName} (${updatedProfile.email}) has completed phone verification and is pending approval.`,
            actionUrl: `/admin/b2b-vendors/pending`,
            metadata: {
              vendorId: updatedProfile._id.toString(),
              vendorName: updatedProfile.storeName,
              email: updatedProfile.email,
              phone: updatedProfile.phone
            }
          }, 'admins');
        } catch (e) {
          console.error('[VerifyOTP] Failed to send admin notification:', e.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      isNewUser: false,
      token: generateToken({
        id: updatedProfile._id,
        email: updatedProfile.email,
        role: updatedProfile.role || finalRole
      }),
      user: updatedProfile,
      role: finalRole
    });
});

/**
 * Reset password by phone number with OTP
 * POST /api/auth/reset-password-phone
 */
export const resetPasswordByPhone = asyncHandler(async (req, res) => {
    const { phoneNumber, otp, newPassword } = req.body;

    if (!phoneNumber || !otp || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Phone number, OTP, and new password are required'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters'
        });
    }

    // Find the latest OTP for this phone number
    const storedOtp = await SMSOTP.findOne({
        phoneNumber,
        purpose: { $in: ['password_reset', 'verification', 'login', 'registration'] }
    }).sort({ createdAt: -1 });

    if (!storedOtp) {
        return res.status(404).json({
            success: false,
            message: 'OTP not found. Please request a new one.'
        });
    }

    // Check expiry
    if (new Date() > storedOtp.expiresAt) {
        return res.status(403).json({
            success: false,
            message: 'OTP has expired. Please request a new one.'
        });
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
        return res.status(401).json({
            success: false,
            message: 'Invalid OTP'
        });
    }

    // Find user by phone
    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found with this phone number'
        });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    // Clean up used OTPs
    await SMSOTP.deleteMany({ phoneNumber });

    res.status(200).json({
        success: true,
        message: 'Password reset successfully'
    });
});

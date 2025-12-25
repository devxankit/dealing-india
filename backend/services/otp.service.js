import OTP from '../models/OTP.model.js';
import { isValidOTP } from '../utils/validators.util.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
const RATE_LIMIT_REQUESTS = parseInt(process.env.OTP_RATE_LIMIT_REQUESTS) || 3;
const RATE_LIMIT_WINDOW = parseInt(process.env.OTP_RATE_LIMIT_WINDOW) || 15; // minutes

/**
 * Generate a 4-digit OTP and store it in database
 * @param {String} identifier - Email or phone number
 * @param {String} type - 'email_verification' or 'password_reset'
 * @returns {Promise<String>} Generated OTP code
 */
export const generateOTP = async (identifier, type) => {
  try {
    if (!identifier || !type) {
      throw new Error('Identifier and type are required');
    }

    // Normalize identifier (lowercase for email)
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Check rate limiting - count OTPs generated in the last RATE_LIMIT_WINDOW minutes
    const rateLimitWindowStart = new Date(Date.now() - RATE_LIMIT_WINDOW * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      identifier: normalizedIdentifier,
      type,
      createdAt: { $gte: rateLimitWindowStart },
    });

    if (recentOTPs >= RATE_LIMIT_REQUESTS) {
      throw new Error(
        `Too many OTP requests. Please wait ${RATE_LIMIT_WINDOW} minutes before requesting again.`
      );
    }

    // Mark any existing unused OTPs as used (prevent multiple active OTPs)
    await OTP.updateMany(
      {
        identifier: normalizedIdentifier,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      },
      { isUsed: true }
    );

    // Generate 4-digit OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Set expiration time
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database
    await OTP.create({
      identifier: normalizedIdentifier,
      code,
      type,
      expiresAt,
      isUsed: false,
    });

    return code;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify OTP code
 * @param {String} identifier - Email or phone number
 * @param {String} code - 4-digit OTP code
 * @param {String} type - 'email_verification' or 'password_reset'
 * @returns {Promise<Boolean>} True if OTP is valid
 */
export const verifyOTP = async (identifier, code, type) => {
  try {
    if (!identifier || !code || !type) {
      throw new Error('Identifier, code, and type are required');
    }

    // Validate OTP format
    if (!isValidOTP(code)) {
      throw new Error('Invalid OTP format. Must be 4 digits.');
    }

    // Normalize identifier
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Find the OTP
    const otp = await OTP.findOne({
      identifier: normalizedIdentifier,
      code,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Resend OTP (generates new OTP)
 * @param {String} identifier - Email or phone number
 * @param {String} type - 'email_verification' or 'password_reset'
 * @returns {Promise<String>} New OTP code
 */
export const resendOTP = async (identifier, type) => {
  try {
    return await generateOTP(identifier, type);
  } catch (error) {
    throw error;
  }
};


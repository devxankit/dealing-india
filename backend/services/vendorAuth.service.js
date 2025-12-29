import Vendor from '../models/Vendor.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { generateOTP, verifyOTP, resendOTP } from './otp.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { isValidEmail, isValidPhone, validatePassword } from '../utils/validators.util.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';

/**
 * Register a new vendor
 * @param {Object} vendorData - { name, email, phone, password, storeName, storeDescription, address, documents }
 * @returns {Promise<Object>} { vendor, token }
 */
export const registerVendor = async (vendorData) => {
  try {
    const { name, email, phone, password, storeName, storeDescription, address, documents } = vendorData;

    // Validate inputs
    if (!name || !email || !phone || !password || !storeName) {
      throw new Error('Name, email, phone, password, and store name are required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!isValidPhone(phone)) {
      throw new Error('Invalid phone number format');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existingVendor) {
      if (existingVendor.email === email.toLowerCase()) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }
      if (existingVendor.phone === phone) {
        const error = new Error('Phone number already registered');
        error.statusCode = 409;
        throw error;
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Process documents/media if provided - upload to Cloudinary
    let processedDocuments = [];
    if (documents && Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        if (doc.data && doc.name) {
          try {
            // Determine file type and set appropriate resource_type for Cloudinary
            const fileType = doc.type || 'application/pdf'; // Default to PDF if type not provided
            const isImage = fileType.startsWith('image/');
            const isVideo = fileType.startsWith('video/');
            const isPDF = fileType === 'application/pdf';

            let resourceType = 'auto'; // Cloudinary will auto-detect, but we can be specific
            let folderName = 'vendor-documents';

            if (isPDF) {
              resourceType = 'raw'; // PDFs should be uploaded as raw files
            } else if (isImage) {
              resourceType = 'image';
              folderName = 'vendor-documents/images';
            } else if (isVideo) {
              resourceType = 'video';
              folderName = 'vendor-documents/videos';
            }

            // Upload to Cloudinary
            const result = await uploadBase64ToCloudinary(doc.data, folderName, {
              resource_type: resourceType,
            });

            processedDocuments.push({
              name: doc.name,
              url: result.secure_url,
              publicId: result.public_id,
              type: fileType, // Store file type for proper display in admin panel
              uploadedAt: new Date(),
            });
          } catch (uploadError) {
            console.error(`Failed to upload file ${doc.name}:`, uploadError.message);
            // Continue with other files even if one fails
          }
        }
      }
    }

    // Create vendor with pending status
    const vendor = await Vendor.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      storeName: storeName.trim(),
      storeDescription: storeDescription ? storeDescription.trim() : undefined,
      address: address || {},
      documents: processedDocuments,
      status: 'pending', // Vendors start as pending
      isEmailVerified: false,
      isActive: true,
      role: 'vendor',
    });

    // Generate and send verification OTP
    try {
      const otp = await generateOTP(email, 'email_verification');
      await sendVerificationEmail(email, otp);
    } catch (otpError) {
      // Log error but don't fail registration
      console.error('Failed to send verification OTP:', otpError.message);
    }

    // Generate token (vendor can have token but may not be able to login until approved)
    const token = generateToken({
      vendorId: vendor._id.toString(),
      email: vendor.email,
      role: vendor.role,
    });

    // Return vendor without password
    const vendorObj = vendor.toObject();
    delete vendorObj.password;

    return {
      vendor: vendorObj,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login vendor with email and password
 * @param {String} email - Vendor email
 * @param {String} password - Plain text password
 * @returns {Promise<Object>} { vendor, token }
 */
export const loginVendor = async (email, password) => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find vendor by email
    const vendor = await Vendor.findOne({
      email: email.toLowerCase(),
    }).select('+password'); // Include password field

    if (!vendor) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // Check if account is active
    if (!vendor.isActive) {
      const error = new Error('Account is inactive. Please contact support.');
      error.statusCode = 403;
      throw error;
    }

    // Check if vendor is approved (vendors can only login if approved)
    if (vendor.status !== 'approved') {
      const error = new Error(
        `Vendor account is ${vendor.status}. Please wait for admin approval before logging in.`
      );
      error.statusCode = 403;
      throw error;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, vendor.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // Generate token
    const token = generateToken({
      vendorId: vendor._id.toString(),
      email: vendor.email,
      role: vendor.role,
    });

    // Return vendor without password
    const vendorObj = vendor.toObject();
    delete vendorObj.password;

    return {
      vendor: vendorObj,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get vendor by ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor object
 */
export const getVendorById = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return vendor;
  } catch (error) {
    throw error;
  }
};

/**
 * Update vendor profile
 * @param {String} vendorId - Vendor ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated vendor
 */
export const updateVendorProfile = async (vendorId, updateData) => {
  try {
    const { name, phone, storeName, storeDescription, address } = updateData;
    const updateFields = {};

    if (name) {
      updateFields.name = name.trim();
    }

    if (phone !== undefined) {
      if (!isValidPhone(phone)) {
        throw new Error('Invalid phone number format');
      }
      // Check if phone is already taken by another vendor
      const existingVendor = await Vendor.findOne({
        phone,
        _id: { $ne: vendorId },
      });
      if (existingVendor) {
        const error = new Error('Phone number already in use');
        error.statusCode = 409;
        throw error;
      }
      updateFields.phone = phone.trim();
    }

    if (storeName) {
      updateFields.storeName = storeName.trim();
    }

    if (storeDescription !== undefined) {
      updateFields.storeDescription = storeDescription ? storeDescription.trim() : null;
    }

    if (address) {
      updateFields.address = address;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      const error = new Error('Vendor not found');
      error.statusCode = 404;
      throw error;
    }

    return vendor;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify vendor email with OTP
 * @param {String} email - Vendor email
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Boolean>} Success status
 */
export const verifyVendorEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // Verify OTP
    await verifyOTP(email, otp, 'email_verification');

    // Update vendor email verification status
    const vendor = await Vendor.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isEmailVerified: true },
      { new: true }
    );

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Resend verification OTP
 * @param {String} email - Vendor email
 * @returns {Promise<Object>} Success status
 */
export const resendVendorVerificationOTP = async (email) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email is required');
    }

    // Check if vendor exists
    const vendor = await Vendor.findOne({ email: email.toLowerCase() });
    if (!vendor) {
      const error = new Error('Vendor not found');
      error.statusCode = 404;
      throw error;
    }

    if (vendor.isEmailVerified) {
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
 * @param {String} email - Vendor email
 * @returns {Promise<Object>} Success status
 */
export const forgotVendorPassword = async (email) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email is required');
    }

    // Check if vendor exists
    const vendor = await Vendor.findOne({ email: email.toLowerCase() });
    if (!vendor) {
      const error = new Error('No vendor account found with this email address');
      error.statusCode = 404;
      throw error;
    }

    // Check if email is verified
    if (!vendor.isEmailVerified) {
      throw new Error('Please verify your email first before resetting password');
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
 * @param {String} email - Vendor email
 * @param {String} otp - 4-digit OTP code
 * @param {String} newPassword - New password
 * @returns {Promise<Boolean>} Success status
 */
export const resetVendorPassword = async (email, otp, newPassword) => {
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

    // Find vendor
    const vendor = await Vendor.findOne({ email: email.toLowerCase() }).select('+password');
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    vendor.password = hashedPassword;
    await vendor.save();

    return true;
  } catch (error) {
    throw error;
  }
};


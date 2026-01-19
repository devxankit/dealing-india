import Vendor from '../models/Vendor.model.js';
import TemporaryRegistration from '../models/TemporaryRegistration.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { generateOTP, verifyOTP, resendOTP } from './otp.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { isValidEmail, isValidPhone, validatePassword } from '../utils/validators.util.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';
import SubscriptionService from './subscription.service.js';

/**
 * Register a new vendor (temporary - only creates record after email verification)
 * @param {Object} vendorData - { name, email, phone, password, storeName, storeDescription, address, documents }
 * @returns {Promise<Object>} { message, email }
 */
export const registerVendor = async (vendorData) => {
  try {
    const { name, email, phone, password, storeName, storeDescription, address, documents, vendorType, businessTypes, gstNumber, subscriptionPlan } = vendorData;

    // Validate inputs
    if (!name || !email || !phone || !password || !storeName) {
      const error = new Error('Name, email, phone, password, and store name are required');
      error.statusCode = 400;
      throw error;
    }

    if (!isValidEmail(email)) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    if (!isValidPhone(phone)) {
      const error = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const error = new Error(passwordValidation.message);
      error.statusCode = 400;
      throw error;
    }

    // B2B-specific validations
    if (vendorType === 'b2b') {
      if (businessTypes && (!Array.isArray(businessTypes) || businessTypes.length === 0)) {
        const error = new Error('At least one business type is required for B2B vendors');
        error.statusCode = 400;
        throw error;
      }

      // GST number is optional and no format validation required
    }

    // Check if vendor already exists in database
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

    // Check if there's already a pending temporary registration
    const existingTempReg = await TemporaryRegistration.findOne({
      email: email.toLowerCase(),
      registrationType: 'vendor',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingTempReg) {
      // Delete old temporary registration
      await TemporaryRegistration.deleteOne({ _id: existingTempReg._id });
    }

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    // Process documents/media if provided - upload to Cloudinary
    let processedDocuments = [];
    
    // Handle B2B-specific document structure (panCard, businessLicense as objects)
    if (vendorType === 'b2b' && documents && typeof documents === 'object' && !Array.isArray(documents)) {
      // Convert B2B document object to array format
      const docArray = [];
      if (documents.panCard) {
        docArray.push({ name: 'PAN Card', data: documents.panCard, type: 'application/pdf' });
      }
      if (documents.businessLicense) {
        docArray.push({ name: 'Business License', data: documents.businessLicense, type: 'application/pdf' });
      }
      
      // Process each document
      for (const doc of docArray) {
        if (doc.data) {
          try {
            // Determine file type from base64 data or default
            const fileType = doc.type || 'application/pdf';
            const isImage = fileType.startsWith('image/');
            const isPDF = fileType === 'application/pdf';

            if (!isImage && !isPDF) {
              console.warn(`Skipping invalid file type: ${fileType}`);
              continue;
            }

            let resourceType = 'auto';
            let folderName = 'vendor-documents/b2b';

            if (isPDF) {
              resourceType = 'auto';
            } else if (isImage) {
              resourceType = 'image';
              folderName = 'vendor-documents/b2b/images';
            }

            // Upload to Cloudinary
            const result = await uploadBase64ToCloudinary(doc.data, folderName, {
              resource_type: resourceType,
            });

            processedDocuments.push({
              name: doc.name,
              url: result.secure_url,
              publicId: result.public_id,
              type: fileType,
              uploadedAt: new Date(),
            });
          } catch (uploadError) {
            console.error(`Failed to upload file ${doc.name}:`, uploadError.message);
            // Continue with other files even if one fails
          }
        }
      }
    } else if (documents && Array.isArray(documents) && documents.length > 0) {
      // Handle regular array format
      for (const doc of documents) {
        if (doc.data && doc.name) {
          try {
            // Determine file type and set appropriate resource_type for Cloudinary
            const fileType = doc.type || 'application/pdf';
            const isImage = fileType.startsWith('image/');
            const isPDF = fileType === 'application/pdf';

            if (!isImage && !isPDF) {
              console.warn(`Skipping invalid file type: ${fileType}`);
              continue;
            }

            let resourceType = 'auto';
            let folderName = 'vendor-documents';

            if (isPDF) {
              resourceType = 'auto';
            } else if (isImage) {
              resourceType = 'image';
              folderName = 'vendor-documents/images';
            }

            // Upload to Cloudinary
            const result = await uploadBase64ToCloudinary(doc.data, folderName, {
              resource_type: resourceType,
            });

            processedDocuments.push({
              name: doc.name,
              url: result.secure_url,
              publicId: result.public_id,
              type: fileType,
              uploadedAt: new Date(),
            });
          } catch (uploadError) {
            console.error(`Failed to upload file ${doc.name}:`, uploadError.message);
            // Continue with other files even if one fails
          }
        }
      }
    }

    // Store registration data temporarily (expires in 15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await TemporaryRegistration.create({
      email: email.toLowerCase().trim(),
      registrationType: 'vendor',
      registrationData: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password: hashedPassword, // Store hashed password
        storeName: storeName.trim(),
        storeDescription: storeDescription ? storeDescription.trim() : undefined,
        address: address || {},
        documents: processedDocuments, // Store processed documents
        vendorType: vendorType || 'b2c',
        // B2B-specific fields
        businessTypes: businessTypes && Array.isArray(businessTypes) ? businessTypes.map(bt => bt.trim()) : undefined,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
        subscriptionPlan: subscriptionPlan, // Store plan ID for later subscription creation
      },
      expiresAt,
      isVerified: false,
    });

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

    const emailResult = await sendVerificationEmail(email, otp);

    if (!emailResult.success) {
      // If email fails, don't delete temporary registration if it's likely due to missing config
      // Instead, log the OTP for manual verification during development/setup
      console.error(`❌ Failed to send verification email to ${email}:`, emailResult.error);

      const isConfigMissing = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;

      if (isConfigMissing) {
        console.warn('⚠️  EMAIL_USER or EMAIL_PASS missing. Registration allowed to proceed for setup purposes.');
        console.warn(`🔑 VERIFICATION OTP FOR ${email}: ${otp}`);

        return {
          message: 'Registration initiated. (EMAIL CONFIG MISSING - check server logs for OTP)',
          email: email.toLowerCase(),
          debugOtp: otp, // Include OTP in response only if config is missing (for development)
        };
      }

      await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
      throw new Error('Failed to send verification email. Please try again later.');
    }

    console.log(`✅ Verification OTP sent to ${email}`);

    // Return only email - no vendor or token until verified
    return {
      message: 'Registration initiated. Please verify your email to complete registration.',
      email: email.toLowerCase(),
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
    console.log(`[Login Attempt] Email: ${email}`);
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find vendor by email - select all fields including password
    const vendor = await Vendor.findOne({
      email: email.toLowerCase(),
    }).select('+password'); // Include password field, all other fields are included by default

    if (!vendor) {
      console.log(`[Login Failed] Vendor not found: ${email}`);
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // For B2B vendor login, ensure vendorType is b2b
    // Note: This allows both B2B and B2C vendors to use the same login endpoint
    // Frontend can filter based on vendorType if needed

    console.log(`[Login Progress] Vendor found - Email: ${vendor.email}, Type: ${vendor.vendorType}, Status: ${vendor.status}, isActive: ${vendor.isActive}`);

    // Check if account is active
    if (!vendor.isActive) {
      console.log(`[Login Blocked] Account inactive for: ${email}`);
      const error = new Error('Account is inactive. Please contact support.');
      error.statusCode = 403;
      throw error;
    }

    // Check if vendor is approved (vendors can only login if approved)
    if (vendor.status !== 'approved') {
      console.log(`[Login Blocked] Account not approved - Status: ${vendor.status} for: ${email}`);
      const error = new Error(
        `Vendor account is ${vendor.status}. Please wait for admin approval before logging in.`
      );
      error.statusCode = 403;
      throw error;
    }

    // For B2B vendors, check subscription status
    if (vendor.vendorType === 'b2b') {
      const subscription = await SubscriptionService.getVendorSubscription(vendor._id);
      
      // B2B vendors must have an active subscription to login
      if (!subscription) {
        console.log(`[Login Blocked] No subscription found for B2B vendor: ${email}`);
        const error = new Error('You must have an active subscription plan to login. Please subscribe to a plan first.');
        error.statusCode = 403;
        error.code = 'NO_SUBSCRIPTION';
        throw error;
      }

      // Check if subscription is approved (status must be 'active')
      if (subscription.status !== 'active') {
        console.log(`[Login Blocked] Subscription not approved - Status: ${subscription.status} for: ${email}`);
        const error = new Error('Your subscription plan is not approved yet. Please wait for admin approval before logging in.');
        error.statusCode = 403;
        error.code = 'SUBSCRIPTION_NOT_APPROVED';
        throw error;
      }

      // Check if subscription is expired
      const now = new Date();
      if (subscription.endDate && new Date(subscription.endDate) < now) {
        console.log(`[Login Blocked] Subscription expired for: ${email}, Expiry: ${subscription.endDate}`);
        const error = new Error('Your subscription plan has expired. Please renew your subscription to continue.');
        error.statusCode = 403;
        error.code = 'SUBSCRIPTION_EXPIRED';
        error.expiredDate = subscription.endDate;
        throw error;
      }
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, vendor.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
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

    // Ensure vendorType is preserved (critical for B2B login)
    if (!vendorObj.vendorType && vendor.vendorType) {
      vendorObj.vendorType = vendor.vendorType;
    }

    // Populate subscription with plan details if exists (don't let this block login)
    if (vendor.currentSubscription) {
      try {
        await vendor.populate({
          path: 'currentSubscription',
          populate: {
            path: 'planId',
            select: 'name duration price features isActive',
            model: 'B2BSubscriptionPlan',
          },
        });
        vendorObj.currentSubscription = vendor.currentSubscription;
      } catch (subError) {
        console.error(`[Login Warning] Failed to populate subscription for vendor ${vendor.email}:`, subError.message);
        // Don't block login if subscription population fails
        vendorObj.currentSubscription = null;
      }
    }

    console.log(`[Login Success] Vendor ${vendor.email} (${vendor.vendorType}) logged in successfully`);
    console.log(`[Login Success] Vendor object vendorType:`, vendorObj.vendorType);
    console.log(`[Login Success] Returning vendor object keys:`, Object.keys(vendorObj));

    return {
      vendor: vendorObj,
      token,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get vendor by ID or email
 * @param {String} vendorId - Vendor ID (optional)
 * @param {String} email - Vendor email (optional)
 * @returns {Promise<Object>} Vendor object
 */
export const getVendorById = async (vendorId, email = null) => {
  try {
    let vendor;
    if (email) {
      vendor = await Vendor.findOne({ email: email.toLowerCase() });
    } else if (vendorId) {
      vendor = await Vendor.findById(vendorId);
    } else {
      throw new Error('Either vendorId or email must be provided');
    }
    
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
    const { name, phone, storeName, storeDescription, address, gstNumber } = updateData;
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

    if (gstNumber !== undefined) {
      updateFields.gstNumber = gstNumber ? gstNumber.trim().toUpperCase() : '';
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
 * Verify vendor email with OTP and create actual vendor account
 * @param {String} email - Vendor email
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Object>} { vendor, token }
 */
export const verifyVendorEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // Verify OTP first
    await verifyOTP(email, otp, 'email_verification');

    // Find temporary registration
    const tempRegistration = await TemporaryRegistration.findOne({
      email: email.toLowerCase(),
      registrationType: 'vendor',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tempRegistration) {
      throw new Error('Registration session expired or not found. Please register again.');
    }

    // Check if vendor already exists (edge case)
    const existingVendor = await Vendor.findOne({ email: email.toLowerCase() });
    if (existingVendor) {
      // Delete temporary registration
      await TemporaryRegistration.deleteOne({ _id: tempRegistration._id });
      throw new Error('Vendor already exists');
    }

    // Create actual vendor in database
    const vendorData = {
      name: tempRegistration.registrationData.name,
      email: tempRegistration.registrationData.email,
      phone: tempRegistration.registrationData.phone,
      password: tempRegistration.registrationData.password, // Already hashed
      storeName: tempRegistration.registrationData.storeName,
      storeDescription: tempRegistration.registrationData.storeDescription,
      address: tempRegistration.registrationData.address || {},
      documents: tempRegistration.registrationData.documents || [],
      status: 'pending', // Vendors start as pending
      isEmailVerified: true, // Set to true since OTP is verified
      isActive: true,
      role: 'vendor',
      vendorType: tempRegistration.registrationData.vendorType || 'b2c',
    };

    // Add B2B-specific fields if vendorType is b2b
    if (tempRegistration.registrationData.vendorType === 'b2b') {
      if (tempRegistration.registrationData.businessTypes) {
        vendorData.businessTypes = tempRegistration.registrationData.businessTypes;
      }
      if (tempRegistration.registrationData.gstNumber) {
        vendorData.gstNumber = tempRegistration.registrationData.gstNumber;
      }
      // B2B vendors pay subscription fees, NOT commission
      // Set commissionRate to 0 for B2B vendors
      vendorData.commissionRate = 0;
    }

    const vendor = await Vendor.create(vendorData);

    // Mark temporary registration as verified and delete it
    await TemporaryRegistration.deleteOne({ _id: tempRegistration._id });

    // Generate token
    const token = generateToken({
      vendorId: vendor._id.toString(),
      email: vendor.email,
      role: vendor.role,
    });

    // Return vendor without password
    const vendorObj = vendor.toObject();
    delete vendorObj.password;

    console.log(`✅ Vendor account created and verified for ${email}`);

    return {
      vendor: vendorObj,
      token,
    };
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

    // Check if temporary registration exists
    const tempRegistration = await TemporaryRegistration.findOne({
      email: email.toLowerCase(),
      registrationType: 'vendor',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tempRegistration) {
      // Check if vendor already exists and is verified
      const vendor = await Vendor.findOne({ email: email.toLowerCase() });
      if (vendor) {
        if (vendor.isEmailVerified) {
          throw new Error('Email is already verified');
        }
        throw new Error('Registration session expired. Please register again.');
      }
      const error = new Error('No pending registration found. Please register again.');
      error.statusCode = 404;
      throw error;
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


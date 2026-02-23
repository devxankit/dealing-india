import Vendor from '../models/Vendor.model.js';
import TemporaryRegistration from '../models/TemporaryRegistration.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { generateOTP, verifyOTP, resendOTP } from './otp.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { isValidEmail, isValidPhone, validatePassword } from '../utils/validators.util.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';
import SubscriptionService from './subscription.service.js';
import notificationService from './notification.service.js';
import { geocodeAddress } from '../utils/geocoding.util.js';
import { normalizeAddress } from '../utils/addressNormalizer.util.js';

/**
 * Register a new vendor (temporary - only creates record after email verification)
 * @param {Object} vendorData - { name, email, phone, password, storeName, storeDescription, address, documents }
 * @returns {Promise<Object>} { message, email }
 */
export const registerVendor = async (vendorData) => {
  try {
    let { name, email, phone, password, storeName, storeDescription, address, documents, vendorType, businessTypes, businessType, businessTypeRef, gstNumber, subscriptionPlan, selectedSubTypes, mfgOfWork } = vendorData;

    // Fix address fields for model compatibility (zipCode -> pincode)
    if (address && address.zipCode && !address.pincode) {
      address.pincode = address.zipCode;
      delete address.zipCode;
    }

    // Ensure vendorType is set correctly if missing
    if (!vendorType) {
      if (businessTypeRef || (documents && !Array.isArray(documents))) {
        vendorType = 'b2b';
      } else {
        vendorType = 'regular';
      }
    }

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

    // Process documents/media in parallel for performance
    let processedDocuments = [];
    const isB2BDocStructure = documents && typeof documents === 'object' && !Array.isArray(documents);
    let docArray = [];

    if ((vendorType === 'b2b' || isB2BDocStructure) && isB2BDocStructure) {
      if (documents.panCard?.data) {
        docArray.push({ name: documents.panCard.name || 'PAN Card', data: documents.panCard.data, type: documents.panCard.type || 'application/pdf', folder: 'vendor-documents/b2b' });
      }
      if (documents.businessLicense?.data) {
        docArray.push({ name: documents.businessLicense.name || 'Business License', data: documents.businessLicense.data, type: documents.businessLicense.type || 'application/pdf', folder: 'vendor-documents/b2b' });
      }
    } else if (documents && Array.isArray(documents)) {
      docArray = documents.filter(doc => doc.data && doc.name).map(doc => ({ ...doc, folder: 'vendor-documents' }));
    }

    if (docArray.length > 0) {
      processedDocuments = await Promise.all(docArray.map(async (doc) => {
        try {
          const fileType = doc.type || 'application/pdf';
          const isImage = fileType.startsWith('image/');
          const isPDF = fileType === 'application/pdf';
          if (!isImage && !isPDF) return null;

          const resourceType = isImage ? 'image' : 'auto';
          const folderName = isImage ? `${doc.folder}/images` : doc.folder;

          const result = await uploadBase64ToCloudinary(doc.data, folderName, { resource_type: resourceType });
          return { name: doc.name, url: result.secure_url, publicId: result.public_id, type: fileType, uploadedAt: new Date() };
        } catch (err) {
          console.error(`Upload failed for ${doc.name}:`, err.message);
          return null;
        }
      }));
      processedDocuments = processedDocuments.filter(Boolean);
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
        address: normalizeAddress({
          ...(address || {}),
          pincode: address?.pincode || address?.zipCode || '',
          zipCode: address?.zipCode || address?.pincode || '',
        }),
        documents: processedDocuments, // Store processed documents
        vendorType: vendorType,
        // B2B-specific fields
        businessTypes: businessTypes && Array.isArray(businessTypes) ? businessTypes.map(bt => bt.trim()) : undefined,
        businessType: businessType || 'Textile',
        businessTypeRef: businessTypeRef,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
        subscriptionPlan: subscriptionPlan, // Store plan ID for later subscription creation
        selectedSubTypes: selectedSubTypes || [],
        mfgOfWork: mfgOfWork ? mfgOfWork.trim() : undefined,
      },
      expiresAt,
      isVerified: false,
    });

    // Generate and send verification OTP
    let otp;
    try {
      otp = await generateOTP(email, 'email_verification');
    } catch (otpError) {
      if (otpError.isRateLimitError || otpError.statusCode === 429) {
        otpError.status = 429;
        throw otpError;
      }
      otpError.status = 400;
      throw otpError;
    }

    // FIRE AND FORGET - Don't await email sending to avoid timeouts
    // Since we have default OTP '1234' active, failures are acceptable
    setTimeout(async () => {
      try {
        const emailResult = await sendVerificationEmail(email, otp);
        if (!emailResult.success) {
          console.error(`❌ Background Email Error for Vendor ${email}:`, emailResult.error);
        } else {
          console.log(`✅ Background Email Sent to Vendor ${email}`);
        }
      } catch (err) {
        console.error(`❌ Background Email Exception for Vendor ${email}:`, err.message);
      }
    }, 0);

    // Return only email - no vendor or token until verified
    return {
      message: 'Registration initiated. Please verify your email.',
      email: email.toLowerCase(),
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
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

    // Note: This allows B2B vendors to use the login endpoint
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

    // Verify password first as it's the most expensive operation
    const isPasswordValid = await comparePassword(password, vendor.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Generate token concurrently with other processing
    const token = generateToken({
      vendorId: vendor._id.toString(),
      email: vendor.email,
      role: vendor.role,
    });

    // Populate current subscription only if it exists
    const vendorObj = vendor.toObject();
    delete vendorObj.password;

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
        console.error(`[Login Warning] Failed to populate subscription:`, subError.message);
      }
    }

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
    if (vendor && vendor.address) {
      vendor.address.pincode = vendor.address.pincode || vendor.address.zipCode || '';
      vendor.address.zipCode = vendor.address.zipCode || vendor.address.pincode || '';
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
    const { name, phone, storeName, storeDescription, address, gstNumber, businessType, businessTypeRef, selectedSubTypes, mfgOfWork } = updateData;
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

    if (businessType) {
      updateFields.businessType = businessType.trim();
    }

    if (businessTypeRef) {
      updateFields.businessTypeRef = businessTypeRef;
    }

    if (selectedSubTypes) {
      updateFields.selectedSubTypes = selectedSubTypes;
    }

    if (mfgOfWork !== undefined) {
      updateFields.mfgOfWork = mfgOfWork ? mfgOfWork.trim() : '';
    }

    if (address) {
      // Validate and clean address data to prevent incorrect storage
      const cleanedAddress = {
        ...address,
        pincode: address.pincode || address.zipCode || '',
        zipCode: address.zipCode || address.pincode || '',
      };

      // Validate state - should not be a pincode
      if (cleanedAddress.state && /^\d{6}$/.test(cleanedAddress.state.trim())) {
        console.warn(`⚠️ Invalid state value (pincode): "${cleanedAddress.state}" for vendor ${vendorId}`);
        // Don't update state if it's a pincode - keep existing or set to empty
        cleanedAddress.state = '';
      }

      // Validate city - should not be a state name
      const commonStates = ['Madhya Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Rajasthan',
        'Karnataka', 'Tamil Nadu', 'West Bengal', 'Bihar', 'Odisha', 'Andhra Pradesh',
        'Telangana', 'Kerala', 'Punjab', 'Haryana', 'Jharkhand', 'Assam', 'Himachal Pradesh'];
      if (cleanedAddress.city && commonStates.some(s => cleanedAddress.city.trim().toLowerCase() === s.toLowerCase())) {
        console.warn(`⚠️ Invalid city value (state name): "${cleanedAddress.city}" for vendor ${vendorId}`);
        // Don't update city if it's a state name - keep existing or set to empty
        cleanedAddress.city = '';
      }

      // Validate pincode - should not be a country name
      if (cleanedAddress.pincode && (cleanedAddress.pincode.trim().toLowerCase() === 'india' || cleanedAddress.pincode.trim().length > 10)) {
        console.warn(`⚠️ Invalid pincode value: "${cleanedAddress.pincode}" for vendor ${vendorId}`);
        // Don't update pincode if it's invalid - keep existing or set to empty
        cleanedAddress.pincode = '';
      }

      // Trim all address fields
      Object.keys(cleanedAddress).forEach(key => {
        if (typeof cleanedAddress[key] === 'string') {
          cleanedAddress[key] = cleanedAddress[key].trim();
        }
      });

      // Normalize state and city names (fix misspellings/abbreviations)
      const normalized = normalizeAddress(cleanedAddress);
      cleanedAddress.state = normalized.state;
      cleanedAddress.city = normalized.city;

      // Geocode address to get lat/lng
      try {
        const coords = await geocodeAddress(cleanedAddress);
        if (coords) {
          cleanedAddress.lat = coords.lat;
          cleanedAddress.lng = coords.lng;
          updateFields.location = {
            type: 'Point',
            coordinates: [coords.lng, coords.lat] // [lng, lat]
          };
        }
      } catch (geoError) {
        console.error('Geocoding failed during profile update:', geoError.message);
        // Fallback: don't break update if geocoding fails, just log it
      }

      updateFields.address = cleanedAddress;
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
      address: normalizeAddress(tempRegistration.registrationData.address || {}),
      documents: tempRegistration.registrationData.documents || [],
      status: 'pending', // Vendors start as pending
      isEmailVerified: true, // Set to true since OTP is verified
      isActive: true,
      role: 'vendor',
      vendorType: tempRegistration.registrationData.vendorType || 'b2b',
    };

    // Ensure pincode is correctly mapped from zipCode if missing
    if (vendorData.address && vendorData.address.zipCode && !vendorData.address.pincode) {
      vendorData.address.pincode = vendorData.address.zipCode;
    }

    // Geocode address to get lat/lng for the new vendor
    try {
      if (vendorData.address && Object.keys(vendorData.address).length > 0) {
        const coords = await geocodeAddress(vendorData.address);
        if (coords) {
          vendorData.address.lat = coords.lat;
          vendorData.address.lng = coords.lng;
          vendorData.location = {
            type: 'Point',
            coordinates: [coords.lng, coords.lat] // [lng, lat]
          };
        }
      }
    } catch (geoError) {
      console.error('Geocoding failed during vendor registration:', geoError.message);
      // Fallback: don't break registration if geocoding fails
    }

    // Add B2B-specific fields if vendorType is b2b
    if (tempRegistration.registrationData.vendorType === 'b2b') {
      if (tempRegistration.registrationData.businessTypes) {
        vendorData.businessTypes = tempRegistration.registrationData.businessTypes;
      }
      if (tempRegistration.registrationData.businessType) {
        vendorData.businessType = tempRegistration.registrationData.businessType;
      }
      if (tempRegistration.registrationData.businessTypeRef) {
        vendorData.businessTypeRef = tempRegistration.registrationData.businessTypeRef;
      }
      if (tempRegistration.registrationData.selectedSubTypes) {
        vendorData.selectedSubTypes = tempRegistration.registrationData.selectedSubTypes;
      }
      if (tempRegistration.registrationData.gstNumber) {
        vendorData.gstNumber = tempRegistration.registrationData.gstNumber;
      }
      if (tempRegistration.registrationData.mfgOfWork) {
        vendorData.mfgOfWork = tempRegistration.registrationData.mfgOfWork;
      }
      // B2B vendors pay subscription fees, NOT commission
      // Set commissionRate to 0 for B2B vendors
      vendorData.commissionRate = 0;
    }

    const vendor = await Vendor.create(vendorData);

    // Notify admins about new vendor registration
    try {
      await notificationService.sendBulkNotification({
        type: 'vendor_registration',
        title: 'New Vendor Registration',
        message: 'New vendor registration request received.',
        actionUrl: `/admin/b2b-vendors/pending`,
        metadata: {
          vendorId: vendor._id.toString(),
          vendorName: vendor.businessName || vendor.storeName || vendor.name,
          email: vendor.email,
          vendorType: vendor.vendorType
        }
      }, 'admins');
    } catch (notifError) {
      console.error('Failed to notify admins about new vendor registration:', notifError);
    }

    // Mark temporary registration as verified and delete it
    await TemporaryRegistration.deleteOne({ _id: tempRegistration._id });

    // Return vendor without password (no token for pending vendors)
    const vendorObj = vendor.toObject();
    delete vendorObj.password;

    return {
      vendor: vendorObj,
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

    sendPasswordResetEmail(email, otp).catch(e => console.error('BG Email Error:', e.message));

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


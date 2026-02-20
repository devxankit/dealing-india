import Vendor from '../models/Vendor.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import { hashPassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';
import razorpayService from './razorpay.service.js';
import notificationService from './notification.service.js';
import mongoose from 'mongoose';

/**
 * Register B2B vendor without immediate subscription/payment
 * @param {Object} vendorData - Vendor registration data
 * @returns {Promise<Object>} { vendor, token }
 */
export const registerB2BVendor = async (vendorData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
      documents,
      gstNumber,
      businessType,
      businessTypeRef,
      selectedSubTypes,
    } = vendorData;

    // Validate required fields
    if (!name || !email || !phone || !password || !storeName) {
      const error = new Error('Name, email, phone, password, and store name are required');
      error.statusCode = 400;
      throw error;
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    }).session(session);

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

    // Process documents
    let processedDocuments = [];
    if (documents && typeof documents === 'object') {
      const docArray = [];

      // Handle panCard (can be string or object)
      if (documents.panCard) {
        if (typeof documents.panCard === 'object' && documents.panCard.data) {
          docArray.push({
            name: documents.panCard.name || 'PAN Card',
            data: documents.panCard.data,
            type: documents.panCard.type || 'application/pdf'
          });
        } else if (typeof documents.panCard === 'string') {
          docArray.push({ name: 'PAN Card', data: documents.panCard, type: 'application/pdf' });
        }
      }

      // Handle businessLicense (can be string or object)
      if (documents.businessLicense) {
        if (typeof documents.businessLicense === 'object' && documents.businessLicense.data) {
          docArray.push({
            name: documents.businessLicense.name || 'Business License',
            data: documents.businessLicense.data,
            type: documents.businessLicense.type || 'application/pdf'
          });
        } else if (typeof documents.businessLicense === 'string') {
          docArray.push({ name: 'Business License', data: documents.businessLicense, type: 'application/pdf' });
        }
      }

      for (const doc of docArray) {
        if (doc.data) {
          try {
            const fileType = doc.type || 'application/pdf';
            const isImage = fileType.startsWith('image/');
            const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');

            // Skip if not image or PDF
            if (!isImage && !isPDF) {
              console.log(`Skipping file ${doc.name} due to unsupported type: ${fileType}`);
              continue;
            }

            let folderName = 'vendor-documents/b2b';
            let resourceType = 'auto';
            let uploadOptions = {};

            if (isPDF) {
              // User requirement: PDFs must be uploaded as 'image' for inline viewing
              resourceType = 'image';
              folderName = 'vendor-documents/b2b'; // Keep standard folder

              uploadOptions = {
                resource_type: 'image',
                folder: folderName,
                format: 'pdf', // Explicitly request PDF format
                // No need to manually force public_id extension; Cloudinary image upload handles this
              };
            } else if (isImage) {
              resourceType = 'image';
              folderName = 'vendor-documents/b2b/images';
              uploadOptions = {
                resource_type: 'image',
                folder: folderName
              };
            }

            const result = await uploadBase64ToCloudinary(doc.data, null, uploadOptions);

            processedDocuments.push({
              name: doc.name,
              url: result.secure_url,
              publicId: result.public_id,
              type: fileType,
              uploadedAt: new Date(),
            });
          } catch (uploadError) {
            console.error(`Failed to upload file ${doc.name}:`, uploadError.message);
          }
        }
      }
    }

    // Prepare address data
    const addressData = address || {};
    if (addressData.pincode && !addressData.zipCode) {
      addressData.zipCode = addressData.pincode;
    }
    if (addressData.zipCode && !addressData.pincode) {
      addressData.pincode = addressData.zipCode;
    }

    // Create vendor with status 'pending' (requires admin approval)
    const newVendorData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      storeName: storeName.trim(),
      storeDescription: storeDescription ? storeDescription.trim() : undefined,
      address: addressData,
      documents: processedDocuments,
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
      vendorType: 'b2b',
      status: 'pending', // Requires admin approval
      isEmailVerified: false, // Will be verified later or by admin
      isActive: true,
      role: 'vendor',
      commissionRate: 0,
      businessType: businessType || 'Textile',
      businessTypeRef: businessTypeRef || undefined,
      selectedSubTypes: selectedSubTypes || [],
    };

    const vendor = await Vendor.create([newVendorData], { session });
    const createdVendor = vendor[0];

    // Notify admins about new B2B vendor registration
    try {
      await notificationService.sendBulkNotification({
        type: 'vendor_registration',
        title: 'New B2B Vendor Registration',
        message: 'New vendor registration request received.',
        actionUrl: `/admin/b2b-vendors/pending`,
        metadata: {
          vendorId: createdVendor._id.toString(),
          vendorName: createdVendor.businessName || createdVendor.storeName || createdVendor.name,
          email: createdVendor.email,
          vendorType: 'b2b'
        }
      }, 'admins');
    } catch (notifError) {
      console.error('Failed to notify admins about new B2B vendor registration:', notifError);
    }

    await session.commitTransaction();

    // Generate token
    const token = generateToken({
      vendorId: createdVendor._id.toString(),
      email: createdVendor.email,
      role: createdVendor.role,
    });

    // Return vendor without password
    const vendorObj = createdVendor.toObject();
    delete vendorObj.password;

    return {
      vendor: vendorObj,
      token,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error in registerB2BVendor:', error);
    if (error.statusCode) throw error;
    const wrappedError = new Error(error.message || 'Failed to register B2B vendor');
    wrappedError.statusCode = 500;
    throw wrappedError;
  } finally {
    session.endSession();
  }
};

/**
 * Register B2B vendor with subscription after payment
 * @param {Object} vendorData - Vendor registration data
 * @param {String} planId - B2B subscription plan ID
 * @param {Object} paymentData - Payment verification data (razorpayOrderId, razorpayPaymentId, razorpaySignature)
 * @returns {Promise<Object>} { vendor, token, subscription }
 */
export const registerB2BVendorWithSubscription = async (vendorData, planId, paymentData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      email,
      phone,
      password,
      storeName,
      storeDescription,
      address,
      documents,
      gstNumber,
      businessType,
      businessTypeRef,
      selectedSubTypes,
    } = vendorData;

    // First, try to find existing subscription created after payment
    // This happens when payment was completed before registration
    let existingSubscription = null;
    if (email && paymentData?.razorpayPaymentId) {
      existingSubscription = await VendorSubscription.findOne({
        pendingVendorEmail: email.toLowerCase(),
        razorpayPaymentId: paymentData.razorpayPaymentId,
        vendorId: null, // Not yet linked to vendor
      }).session(session);
    }

    if (existingSubscription) {
      console.log('✅ Found existing subscription created after payment:', {
        subscriptionId: existingSubscription._id.toString(),
        email: existingSubscription.pendingVendorEmail,
        razorpayPaymentId: existingSubscription.razorpayPaymentId,
      });
    } else {
      console.log('ℹ️ No existing subscription found, will create new one during registration');

      // Validate payment data if no existing subscription
      if (!paymentData || !paymentData.razorpayPaymentId) {
        const error = new Error('Payment data is required');
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate required fields
    if (!name || !email || !phone || !password || !storeName) {
      const error = new Error('Name, email, phone, password, and store name are required');
      error.statusCode = 400;
      throw error;
    }

    // GST number is optional and no format validation required

    // Validate planId format
    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      const error = new Error('Invalid subscription plan ID');
      error.statusCode = 400;
      throw error;
    }

    // Validate plan exists
    const plan = await B2BSubscriptionPlan.findById(planId).session(session);
    if (!plan) {
      const error = new Error('Subscription plan not found');
      error.statusCode = 404;
      throw error;
    }
    if (!plan.isActive) {
      const error = new Error('Subscription plan is not active');
      error.statusCode = 400;
      throw error;
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    }).session(session);

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

    // Process documents
    let processedDocuments = [];
    if (documents && typeof documents === 'object') {
      const docArray = [];

      // Handle panCard (can be string or object)
      if (documents.panCard) {
        if (typeof documents.panCard === 'object' && documents.panCard.data) {
          docArray.push({
            name: documents.panCard.name || 'PAN Card',
            data: documents.panCard.data,
            type: documents.panCard.type || 'application/pdf'
          });
        } else if (typeof documents.panCard === 'string') {
          docArray.push({ name: 'PAN Card', data: documents.panCard, type: 'application/pdf' });
        }
      }

      // Handle businessLicense (can be string or object)
      if (documents.businessLicense) {
        if (typeof documents.businessLicense === 'object' && documents.businessLicense.data) {
          docArray.push({
            name: documents.businessLicense.name || 'Business License',
            data: documents.businessLicense.data,
            type: documents.businessLicense.type || 'application/pdf'
          });
        } else if (typeof documents.businessLicense === 'string') {
          docArray.push({ name: 'Business License', data: documents.businessLicense, type: 'application/pdf' });
        }
      }

      for (const doc of docArray) {
        if (doc.data) {
          try {
            const fileType = doc.type || 'application/pdf';
            const isImage = fileType.startsWith('image/');
            const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');

            // Skip if not image or PDF
            if (!isImage && !isPDF) {
              console.log(`Skipping file ${doc.name} due to unsupported type: ${fileType}`);
              continue;
            }

            let folderName = 'vendor-documents/b2b';
            let resourceType = 'auto';
            let uploadOptions = {};

            if (isPDF) {
              // User requirement: PDFs must be uploaded as 'image' for inline viewing
              resourceType = 'image';
              folderName = 'vendor-documents/b2b';

              uploadOptions = {
                resource_type: 'image',
                folder: folderName,
                format: 'pdf',
              };
            } else if (isImage) {
              resourceType = 'image';
              folderName = 'vendor-documents/b2b/images';
              uploadOptions = {
                resource_type: 'image',
                folder: folderName
              };
            }

            const result = await uploadBase64ToCloudinary(doc.data, null, uploadOptions);

            processedDocuments.push({
              name: doc.name,
              url: result.secure_url,
              publicId: result.public_id,
              type: fileType,
              uploadedAt: new Date(),
            });
          } catch (uploadError) {
            console.error(`Failed to upload file ${doc.name}:`, uploadError.message);
          }
        }
      }
    }

    // Prepare address data - ensure compatibility with schema
    const addressData = address || {};
    // Ensure both pincode and zipCode are set for compatibility
    if (addressData.pincode && !addressData.zipCode) {
      addressData.zipCode = addressData.pincode;
    }
    if (addressData.zipCode && !addressData.pincode) {
      addressData.pincode = addressData.zipCode;
    }

    // Create vendor
    const newVendorData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      storeName: storeName.trim(),
      storeDescription: storeDescription ? storeDescription.trim() : undefined,
      address: addressData,
      documents: processedDocuments,
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
      vendorType: 'b2b',
      status: 'pending', // Requires admin approval
      isEmailVerified: true, // Payment implies email verification
      isActive: true,
      role: 'vendor',
      commissionRate: 0, // B2B vendors pay subscription fees, NOT commission - set to 0
      businessType: businessType || 'Textile',
      businessTypeRef: businessTypeRef || undefined,
      selectedSubTypes: selectedSubTypes || [],
    };

    const vendor = await Vendor.create([newVendorData], { session });

    const createdVendor = vendor[0];

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration);

    // Validate payment data
    if (!paymentData || !paymentData.razorpayPaymentId) {
      const error = new Error('Payment data is required for subscription creation');
      error.statusCode = 400;
      throw error;
    }

    // Create subscription
    // Note: For B2B subscriptions, we use planId (not tierId)
    // Validation in model ensures either tierId or planId is present

    // Ensure plan._id is a valid ObjectId
    if (!plan._id || !mongoose.Types.ObjectId.isValid(plan._id)) {
      const error = new Error('Invalid plan ID');
      error.statusCode = 400;
      throw error;
    }

    const planObjectId = plan._id instanceof mongoose.Types.ObjectId
      ? plan._id
      : new mongoose.Types.ObjectId(plan._id);

    console.log('Plan details for subscription:', {
      planId: planObjectId.toString(),
      planName: plan.name,
      planDuration: plan.duration,
      planPrice: plan.price,
    });

    // Prepare subscription data with payment information
    const subscriptionData = {
      vendorId: createdVendor._id,
      planId: planObjectId, // B2B subscription uses planId (not tierId) - ensure it's ObjectId
      status: 'active', // Active after payment
      billingCycle: 'Yearly',
      startDate,
      endDate,
      paymentMethod: 'razorpay',
      razorpayOrderId: paymentData.razorpayOrderId || null,
      razorpayPaymentId: paymentData.razorpayPaymentId || null,
      razorpaySignature: paymentData.razorpaySignature || null,
      lastPaymentDate: startDate,
      nextBillingDate: endDate,
      autoRenew: false, // B2B plans don't auto-renew by default
      usage: {
        lastResetDate: startDate,
      },
    };

    // Log subscription data for debugging
    console.log('Creating subscription with data:', {
      vendorId: subscriptionData.vendorId.toString(),
      planId: subscriptionData.planId.toString(),
      razorpayOrderId: subscriptionData.razorpayOrderId,
      razorpayPaymentId: subscriptionData.razorpayPaymentId,
      razorpaySignature: subscriptionData.razorpaySignature ? 'Present' : 'Missing',
      paymentMethod: subscriptionData.paymentMethod,
    });

    let subscription;
    try {
      subscription = await VendorSubscription.create([subscriptionData], { session });

      console.log('✅ New subscription created successfully:', {
        subscriptionId: subscription[0]._id.toString(),
        vendorId: subscription[0].vendorId.toString(),
        planId: subscription[0].planId?.toString(),
        razorpayPaymentId: subscription[0].razorpayPaymentId,
      });
    } catch (subError) {
      console.error('Error creating subscription:', {
        error: subError.message,
        name: subError.name,
        code: subError.code,
        errors: subError.errors,
        stack: subError.stack,
        subscriptionData: {
          vendorId: subscriptionData.vendorId?.toString(),
          planId: subscriptionData.planId?.toString(),
          hasPaymentData: !!paymentData,
          razorpayPaymentId: paymentData?.razorpayPaymentId,
        },
      });
      if (subError.name === 'ValidationError') {
        const error = new Error(`Subscription validation failed: ${subError.message}`);
        error.statusCode = 400;
        throw error;
      }
      throw subError;
    }

    // Verify subscription has payment data
    if (!subscription[0].razorpayPaymentId) {
      console.error('⚠️ WARNING: Payment ID missing in subscription!');
    }
    if (!subscription[0].planId) {
      console.error('⚠️ WARNING: Plan ID missing in subscription!');
    }

    // Link subscription to vendor
    createdVendor.currentSubscription = subscription[0]._id;
    await createdVendor.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Verify data was saved after commit (outside transaction)
    const finalVendor = await Vendor.findById(createdVendor._id).lean();
    const finalSubscription = await VendorSubscription.findById(subscription[0]._id).lean();

    console.log('✅ Transaction committed successfully. Vendor and subscription created:', {
      vendorId: createdVendor._id.toString(),
      vendorEmail: finalVendor?.email,
      subscriptionId: subscription[0]._id.toString(),
      planId: finalSubscription?.planId?.toString() || 'NULL',
      razorpayPaymentId: finalSubscription?.razorpayPaymentId || 'MISSING',
      razorpayOrderId: finalSubscription?.razorpayOrderId || 'MISSING',
      razorpaySignature: finalSubscription?.razorpaySignature ? 'Present' : 'MISSING',
      status: finalSubscription?.status,
    });

    // Final verification - check if payment data is actually in database
    if (!finalSubscription?.razorpayPaymentId) {
      console.error('❌ CRITICAL: Payment ID was NOT saved to database after commit!');
      console.error('Subscription data:', JSON.stringify(finalSubscription, null, 2));
    }
    if (!finalSubscription?.planId) {
      console.error('❌ CRITICAL: Plan ID was NOT saved to database after commit!');
    }

    // Generate token
    const token = generateToken({
      vendorId: createdVendor._id.toString(),
      email: createdVendor.email,
      role: createdVendor.role,
    });

    // Return vendor without password
    const vendorObj = createdVendor.toObject();
    delete vendorObj.password;

    // Notify admins about new B2B vendor registration AND subscription purchase
    try {
      // 1. Notify about Registration
      await notificationService.sendBulkNotification({
        type: 'vendor_registration',
        title: 'New B2B Vendor Registration',
        message: 'New vendor registration request received.',
        actionUrl: `/admin/vendors/pending`,
        metadata: {
          vendorId: createdVendor._id.toString(),
          vendorName: createdVendor.businessName || createdVendor.storeName || createdVendor.name,
          email: createdVendor.email,
          vendorType: 'b2b'
        }
      }, 'admins');

      // 2. Notify about Subscription Purchase
      await notificationService.sendBulkNotification({
        type: 'payment_success',
        title: 'Vendor Subscription Purchase',
        message: 'Vendor has purchased a subscription plan.',
        actionUrl: `/admin/subscriptions/${subscription[0]._id}`,
        metadata: {
          vendorId: createdVendor._id.toString(),
          vendorName: createdVendor.businessName || createdVendor.storeName || createdVendor.name,
          planId: planObjectId.toString(),
          planName: plan.name,
          amount: plan.price
        }
      }, 'admins');
    } catch (notifError) {
      console.error('Failed to notify admins about B2B registration/subscription:', notifError);
    }

    return {
      vendor: vendorObj,
      token,
      subscription: subscription[0],
    };
  } catch (error) {
    await session.abortTransaction();
    // Log error for debugging
    console.error('❌ Error in registerB2BVendorWithSubscription:', {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      errors: error.errors,
    });

    // Re-throw with proper error message
    if (error.statusCode) {
      throw error;
    }
    // Wrap unknown errors
    const wrappedError = new Error(error.message || 'Failed to register B2B vendor');
    wrappedError.statusCode = error.statusCode || 500;
    throw wrappedError;
  } finally {
    session.endSession();
    console.log('Session ended');
  }
};

/**
 * Create subscription immediately after payment success (before vendor registration)
 * This allows subscription to be stored in database before vendor account is created
 * @param {String} planId - B2B subscription plan ID
 * @param {Object} paymentData - Payment verification data
 * @param {String} email - Vendor email (for linking later)
 * @param {String} phone - Vendor phone (for linking later)
 * @returns {Promise<Object>} Created subscription
 */
export const createB2BSubscriptionAfterPayment = async (planId, paymentData, email, phone) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate payment data
    if (!paymentData || !paymentData.razorpayPaymentId) {
      const error = new Error('Payment data is required');
      error.statusCode = 400;
      throw error;
    }

    if (!email || !phone) {
      const error = new Error('Email and phone are required to create subscription');
      error.statusCode = 400;
      throw error;
    }

    // Validate plan
    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      const error = new Error('Invalid subscription plan ID');
      error.statusCode = 400;
      throw error;
    }

    const plan = await B2BSubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      const error = new Error('Invalid or inactive subscription plan');
      error.statusCode = 400;
      throw error;
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration);

    // Create subscription with email/phone reference (vendorId will be linked later)
    const subscriptionData = {
      vendorId: null, // Will be linked during registration
      planId: plan._id instanceof mongoose.Types.ObjectId
        ? plan._id
        : new mongoose.Types.ObjectId(plan._id),
      pendingVendorEmail: email,
      pendingVendorPhone: phone,
      status: 'active', // Active after payment
      billingCycle: 'Yearly',
      startDate,
      endDate,
      paymentMethod: 'razorpay',
      razorpayOrderId: paymentData.razorpayOrderId || null,
      razorpayPaymentId: paymentData.razorpayPaymentId || null,
      razorpaySignature: paymentData.razorpaySignature || null,
      lastPaymentDate: startDate,
      nextBillingDate: endDate,
      autoRenew: false,
      usage: {
        lastResetDate: startDate,
      },
    };

    console.log('Creating subscription after payment (before vendor registration):', {
      planId: subscriptionData.planId.toString(),
      email: subscriptionData.pendingVendorEmail,
      phone: subscriptionData.pendingVendorPhone,
      razorpayPaymentId: subscriptionData.razorpayPaymentId,
    });

    const subscription = await VendorSubscription.create([subscriptionData], { session });

    await session.commitTransaction();

    // Notify admins about B2B subscription purchase
    try {
      await notificationService.sendBulkNotification({
        type: 'payment_success',
        title: 'Vendor Subscription Purchase',
        message: 'Vendor has purchased a subscription plan.',
        actionUrl: `/admin/subscriptions/${subscription[0]._id}`,
        metadata: {
          vendorEmail: email,
          planId: plan._id.toString(),
          planName: plan.name,
          amount: plan.price
        }
      }, 'admins');
    } catch (notifError) {
      console.error('Failed to notify admins about B2B subscription purchase:', notifError);
    }

    console.log('✅ Subscription created successfully after payment:', {
      subscriptionId: subscription[0]._id.toString(),
      email: subscription[0].pendingVendorEmail,
      razorpayPaymentId: subscription[0].razorpayPaymentId,
    });

    return subscription[0];
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating subscription after payment:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Initialize Razorpay order for B2B vendor registration payment
 * @param {String} planId - B2B subscription plan ID
 * @returns {Promise<Object>} { razorpay, razorpayKeyId }
 */
export const initializeB2BRegistrationPayment = async (planId) => {
  try {
    // Validate planId format
    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      const error = new Error('Invalid subscription plan ID');
      error.statusCode = 400;
      throw error;
    }

    // Validate plan exists
    const plan = await B2BSubscriptionPlan.findById(planId);
    if (!plan) {
      const error = new Error('Subscription plan not found');
      error.statusCode = 404;
      throw error;
    }
    if (!plan.isActive) {
      const error = new Error('Subscription plan is not active');
      error.statusCode = 400;
      throw error;
    }

    // Create Razorpay order
    let razorpayOrder;
    try {
      // Validate plan price
      if (!plan.price || plan.price <= 0) {
        const error = new Error('Invalid plan price');
        error.statusCode = 400;
        throw error;
      }

      const orderCode = `B2B-REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Check if razorpayService is available
      if (!razorpayService || typeof razorpayService.createOrder !== 'function') {
        const error = new Error('Payment service is not available');
        error.statusCode = 500;
        throw error;
      }

      razorpayOrder = await razorpayService.createOrder(
        plan.price,
        'INR',
        orderCode,
        {
          planId: plan._id.toString(),
          planName: plan.name,
          duration: plan.duration,
          type: 'b2b_vendor_registration',
        }
      );
    } catch (razorpayError) {
      console.error('Razorpay order creation error:', {
        message: razorpayError.message,
        stack: razorpayError.stack,
        statusCode: razorpayError.statusCode,
      });

      // Check if it's a Razorpay configuration error
      if (razorpayError.message && razorpayError.message.includes('Razorpay not configured')) {
        const error = new Error('Payment gateway is not configured. Please contact support.');
        error.statusCode = 500;
        throw error;
      }

      const error = new Error(razorpayError.message || 'Failed to initialize payment gateway');
      error.statusCode = razorpayError.statusCode || 500;
      throw error;
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;

    if (!razorpayOrder || !razorpayOrder.id) {
      const error = new Error('Failed to create Razorpay order - invalid response');
      error.statusCode = 500;
      throw error;
    }

    return {
      razorpay: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      razorpayKeyId,
      plan: {
        _id: plan._id,
        name: plan.name,
        duration: plan.duration,
        price: plan.price,
      },
    };
  } catch (error) {
    console.error('Error in initializeB2BRegistrationPayment:', error);
    // Wrap error with proper message
    if (error.statusCode) {
      throw error;
    }
    const wrappedError = new Error(error.message || 'Failed to initialize payment');
    wrappedError.statusCode = error.statusCode || 500;
    throw wrappedError;
  }
};

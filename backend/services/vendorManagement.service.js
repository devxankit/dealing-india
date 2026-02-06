import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';

import redisService from './redis.service.js';
import mongoose from 'mongoose';

/**
 * Get all vendors with optional filters
 * @param {Object} filters - { status, search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getAllVendors = async (filters = {}) => {
  try {
    const {
      status,
      isActive,
      search,
      vendorType, // Add vendorType
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = {};

    // Force B2B vendors only for this service
    query.vendorType = 'b2b';

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by isActive if provided
    if (isActive !== undefined && isActive !== null) {
      query.isActive = isActive === true || isActive === 'true';
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [vendorsRaw, total] = await Promise.all([
      Vendor.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Vendor.countDocuments(query),
    ]);

    const vendors = vendorsRaw.map(vendor => ({
      ...vendor,
      performance: { totalOrders: 0, totalEarnings: 0 }
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      vendors,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
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
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

/**
 * Update vendor status
 * @param {String} vendorId - Vendor ID
 * @param {String} status - New status (pending, approved, rejected)
 * @param {String} reason - Optional reason for status change
 * @returns {Promise<Object>} Updated vendor
 */
export const updateVendorStatus = async (vendorId, status, reason = null) => {
  try {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status. Must be one of: pending, approved, rejected');
    }

    const updateData = { status };
    if (reason) {
      updateData.suspensionReason = reason;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Cache Invalidation
    try {
      await redisService.del(`vendor:details:${vendorId}`);
      await redisService.clearPattern('vendors:list:*');
    } catch (cacheError) {
      console.error('Cache invalidation error (updateVendorStatus):', cacheError);
    }

    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

/**
 * Update vendor commission rate
 * @param {String} vendorId - Vendor ID
 * @param {Number} commissionRate - Commission rate (0-1)
 * @returns {Promise<Object>} Updated vendor
 */
export const updateCommissionRate = async (vendorId, commissionRate) => {
  try {
    if (commissionRate < 0 || commissionRate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { commissionRate },
      { new: true, runValidators: true }
    ).lean();

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

/**
 * Toggle vendor active status
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated vendor
 */
export const toggleVendorActive = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    // Cache Invalidation
    try {
      await redisService.del(`vendor:details:${vendorId}`);
      await redisService.clearPattern('vendors:list:*');
      await redisService.clearPattern('home:featured_vendors:*');
    } catch (cacheError) {
      console.error('Cache invalidation error (toggleVendorActive):', cacheError);
    }

    return vendor;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};


/**
 * Get pending vendors
 * @param {Object} filters - { search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getPendingVendors = async (filters = {}) => {
  try {
    return getAllVendors({ ...filters, status: 'pending' });
  } catch (error) {
    throw error;
  }
};

/**
 * Get approved vendors
 * @param {Object} filters - { search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getApprovedVendors = async (filters = {}) => {
  try {
    return getAllVendors({ ...filters, status: 'approved' });
  } catch (error) {
    throw error;
  }
};

/**
 * Get B2B vendors with subscription information
 * @param {Object} filters - { status, search, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getB2BVendors = async (filters = {}) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query for B2B vendors - ALWAYS filter by vendorType: 'b2b'
    // This is CRITICAL - must only return vendors with vendorType='b2b'
    // Use $and from the start to ensure vendorType filter is NEVER lost
    const baseConditions = [
      { vendorType: 'b2b' }, // STRICT: Only B2B vendors - CRITICAL FILTER
      { isActive: true }, // Only active vendors
    ];

    // Filter by status
    if (status && status !== 'all') {
      baseConditions.push({ status: status });
    }

    // Search filter - add to $and array
    if (search && search.trim()) {
      baseConditions.push({
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { storeName: { $regex: search.trim(), $options: 'i' } },
          { phone: { $regex: search.trim(), $options: 'i' } },
          { gstNumber: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }

    // Build final query with $and to ensure ALL conditions are met
    const query = { $and: baseConditions };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Log query for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 B2B Vendors Query:', JSON.stringify(query, null, 2));
      console.log('🔍 Expected: Only vendors with vendorType="b2b"');
    }

    // Execute query with subscription population (including payment details)
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate({
          path: 'currentSubscription',
          select: 'status startDate endDate planId razorpayOrderId razorpayPaymentId razorpaySignature paymentMethod lastPaymentDate nextBillingDate',
          populate: {
            path: 'planId',
            select: 'name duration price features',
            model: 'B2BSubscriptionPlan', // Explicitly specify model
          },
          options: { strictPopulate: false }, // Allow null subscriptions
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .catch(err => {
          console.error('Error fetching vendors:', err);
          throw err;
        }),
      Vendor.countDocuments(query).catch(err => {
        console.error('Error counting vendors:', err);
        throw err;
      }),
    ]);

    // CRITICAL: Post-filter to ensure ONLY B2B vendors are returned
    // This is a safety check in case any vendors slipped through the query
    const verifiedB2BVendors = vendors.filter(vendor => {
      // Get vendorType - handle both lean objects and Mongoose documents
      let vendorType;
      if (vendor.toObject) {
        const vendorObj = vendor.toObject();
        vendorType = vendorObj.vendorType;
      } else {
        vendorType = vendor.vendorType;
      }

      // STRICT: Only return vendors with vendorType='b2b' (exact string match)
      // Reject if vendorType is undefined, null, or anything other than 'b2b'
      const isB2B = vendorType === 'b2b';
      const isActive = vendor.isActive === true;

      // Log rejected vendors for debugging
      if (!isB2B) {
        console.warn(`⚠️ REJECTED non-B2B vendor from B2B list:`, {
          email: vendor.email,
          storeName: vendor.storeName,
          vendorType: vendorType,
          expected: 'b2b'
        });
      }

      return isB2B && isActive;
    });

    // Log if any vendors were filtered out (indicates data inconsistency)
    if (vendors.length !== verifiedB2BVendors.length) {
      console.warn(`⚠️ WARNING: Filtered out ${vendors.length - verifiedB2BVendors.length} non-B2B vendors from B2B vendor list`);
      console.warn(`⚠️ Original count: ${vendors.length}, Filtered count: ${verifiedB2BVendors.length}`);

      // Log all rejected vendors for debugging
      vendors.forEach(vendor => {
        const vendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
        if (vendorType !== 'b2b') {
          console.warn(`  - Rejected: ${vendor.email} (vendorType: ${vendorType})`);
        }
      });
    }

    // Get product counts for all vendors
    const vendorIds = verifiedB2BVendors.map(v => v._id);

    // Count products for each vendor in parallel
    const productCounts = await Promise.all(
      vendorIds.map(async (vendorId) => {
        const count = await Product.countDocuments({
          vendorId: vendorId,
          isActive: true
        });
        return { vendorId: vendorId.toString(), count };
      })
    );

    // Create a map for quick lookup
    const productCountMap = new Map();
    productCounts.forEach(({ vendorId, count }) => {
      productCountMap.set(vendorId, count);
    });

    // Format vendors for admin panel - use verified B2B vendors only
    // FINAL CHECK: Verify vendorType one more time before formatting
    const formattedVendors = verifiedB2BVendors
      .filter(vendor => {
        // Triple-check: Ensure vendorType is 'b2b'
        const vendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
        if (vendorType !== 'b2b') {
          console.error(`❌ CRITICAL: Non-B2B vendor passed through filters: ${vendor.email}, vendorType: ${vendorType}`);
          return false;
        }
        return true;
      })
      .map(vendor => {
        try {
          // Safely access subscription data
          const subscription = vendor.currentSubscription;
          const plan = subscription?.planId;

          // Final vendorType check - if it's not 'b2b', exclude it
          const finalVendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
          if (finalVendorType !== 'b2b') {
            console.error(`❌ CRITICAL: Non-B2B vendor in formatting: ${vendor.email}`);
            return null; // Return null to filter out later
          }

          return {
            _id: vendor._id,
            id: vendor._id.toString(),
            name: vendor.name || 'N/A',
            companyName: vendor.storeName || vendor.name || 'N/A',
            email: vendor.email || 'N/A',
            phone: vendor.phone || 'N/A',
            status: vendor.status === 'approved' ? 'Active' : vendor.status === 'pending' ? 'Pending' : vendor.status || 'Inactive',
            products: productCountMap.get(vendor._id.toString()) || 0,
            joinDate: vendor.createdAt ? new Date(vendor.createdAt).toISOString().split('T')[0] : null,
            gstNumber: vendor.gstNumber || 'N/A',
            businessTypes: vendor.businessTypes || [],
            subscription: subscription
              ? {
                _id: subscription._id,
                name: plan?.name || 'N/A',
                price: plan?.price || 0,
                duration: plan?.duration || 0,
                status: subscription.status || 'N/A',
                startDate: subscription.startDate
                  ? new Date(subscription.startDate).toISOString().split('T')[0]
                  : null,
                endDate: subscription.endDate
                  ? new Date(subscription.endDate).toISOString().split('T')[0]
                  : null,
                paymentMethod: subscription.paymentMethod || 'N/A',
                razorpayOrderId: subscription.razorpayOrderId || null,
                razorpayPaymentId: subscription.razorpayPaymentId || null,
                razorpaySignature: subscription.razorpaySignature || null,
                lastPaymentDate: subscription.lastPaymentDate
                  ? new Date(subscription.lastPaymentDate).toISOString().split('T')[0]
                  : null,
                nextBillingDate: subscription.nextBillingDate
                  ? new Date(subscription.nextBillingDate).toISOString().split('T')[0]
                  : null,
              }
              : null,
            address: vendor.address || {},
            documents: Array.isArray(vendor.documents) ? vendor.documents : [],
            vendorType: 'b2b', // Explicitly set to ensure it's B2B
          };
        } catch (error) {
          console.error('Error formatting vendor:', vendor._id, error);
          // Return minimal vendor data if formatting fails
          return {
            _id: vendor._id,
            id: vendor._id?.toString() || 'N/A',
            name: vendor.name || 'N/A',
            companyName: vendor.storeName || 'N/A',
            email: vendor.email || 'N/A',
            phone: vendor.phone || 'N/A',
            status: vendor.status || 'Unknown',
            products: 0,
            joinDate: null,
            gstNumber: 'N/A',
            businessTypes: [],
            subscription: null,
            address: {},
            documents: [],
          };
        }
      })
      .filter(vendor => vendor !== null); // Remove any null entries from formatting errors

    // Recalculate total based on verified B2B vendors
    const verifiedTotal = formattedVendors.length;
    const totalPages = Math.ceil(verifiedTotal / parseInt(limit));

    return {
      vendors: formattedVendors,
      total: verifiedTotal, // Use verified count, not raw query count
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    console.error('Error in getB2BVendors service:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
};

/**
 * Delete B2B Vendor
 * @param {String} vendorId - Vendor ID to delete
 * @returns {Promise<Boolean>} True if deleted successfully
 */
export const deleteB2BVendor = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new Error('B2B Vendor not found');
    }

    // Ensure it is a B2B vendor
    if (vendor.vendorType !== 'b2b') {
      throw new Error('Cannot delete non-B2B vendor through this endpoint');
    }

    // Optional: Delete associated products (can be done via middleware/hooks too)
    await Product.deleteMany({ vendorId: vendor._id });

    // Delete the vendor
    await Vendor.findByIdAndDelete(vendorId);

    // Cache Invalidation
    try {
      await redisService.del(`vendor:details:${vendorId}`);
      await redisService.clearPattern('vendors:list:*');
      await redisService.clearPattern('admin:vendors:list:*');
    } catch (cacheError) {
      console.error('Cache invalidation error (deleteB2BVendor):', cacheError);
    }

    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid vendor ID');
    }
    throw error;
  }
};

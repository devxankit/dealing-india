import Vendor from '../models/Vendor.model.js';

/**
 * Get all vendors with optional filters
 * @param {Object} filters - { status, search, page, limit }
 * @returns {Promise<Object>} { vendors, total, page, totalPages }
 */
export const getAllVendors = async (filters = {}) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
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
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Vendor.countDocuments(query),
    ]);

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


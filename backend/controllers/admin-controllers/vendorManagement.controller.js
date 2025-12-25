import {
  getAllVendors,
  getVendorById,
  updateVendorStatus,
  updateCommissionRate,
  getPendingVendors,
  getApprovedVendors,
} from '../../services/vendorManagement.service.js';
import {
  getVendorAnalytics,
  getVendorOrders,
} from '../../services/vendorAnalytics.service.js';

/**
 * Get all vendors with filters
 * GET /api/admin/vendors
 */
export const getVendors = async (req, res, next) => {
  try {
    const {
      status = 'all',
      search = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getAllVendors({
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Vendors retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor by ID
 * GET /api/admin/vendors/:id
 */
export const getVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await getVendorById(id);

    res.status(200).json({
      success: true,
      message: 'Vendor retrieved successfully',
      data: { vendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor status
 * PUT /api/admin/vendors/:id/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const vendor = await updateVendorStatus(id, status, reason);

    res.status(200).json({
      success: true,
      message: `Vendor status updated to ${status}`,
      data: { vendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor commission rate
 * PUT /api/admin/vendors/:id/commission
 */
export const updateCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    if (commissionRate === undefined || commissionRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate is required',
      });
    }

    const vendor = await updateCommissionRate(id, commissionRate);

    res.status(200).json({
      success: true,
      message: 'Commission rate updated successfully',
      data: { vendor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending vendors
 * GET /api/admin/vendors/pending
 */
export const getPending = async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getPendingVendors({
      search,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Pending vendors retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get approved vendors
 * GET /api/admin/vendors/approved
 */
export const getApproved = async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getApprovedVendors({
      search,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Approved vendors retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor analytics
 * GET /api/admin/vendors/analytics/:id?
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const analytics = await getVendorAnalytics(id || null);

    res.status(200).json({
      success: true,
      message: 'Vendor analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor orders
 * GET /api/admin/vendors/:id/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
    } = req.query;

    const result = await getVendorOrders(id, {
      page,
      limit,
      status,
    });

    res.status(200).json({
      success: true,
      message: 'Vendor orders retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


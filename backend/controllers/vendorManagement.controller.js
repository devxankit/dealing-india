import {
  getAllVendors,
  getVendorById,
  updateVendorStatus,
  updateCommissionRate,
  toggleVendorActive,
  getPendingVendors,
  getApprovedVendors,
  getB2BVendors,
  deleteB2BVendor,
} from '../services/vendorManagement.service.js';
import notificationService from '../services/notification.service.js';


import redisService from '../services/redis.service.js';
import { getSignedUrl } from '../utils/cloudinary.util.js';

/**
 * Helper to clear vendor-related cache
 */
const clearVendorCache = async (vendorId = null) => {
  try {
    const patterns = [
      'home:featured_vendors:*',
      'public:b2b-locations:*',
      'admin:vendors:list:*'
    ];
    if (vendorId) {
      patterns.push(`vendor:details:*${vendorId}*`);
      patterns.push(`admin:vendors:details:*${vendorId}*`);
    } else {
      patterns.push('vendor:details:*');
      patterns.push('admin:vendors:details:*');
    }
    await Promise.all(patterns.map(pattern => redisService.clearPattern(pattern)));
  } catch (error) {
    console.error('Error clearing vendor cache:', error);
  }
};

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

    // Notify vendor about status update
    try {
      let title = 'Account Status Updated';
      let message = `Your account status has been updated to ${status}.`;

      if (status === 'approved') {
        title = 'Account Approved!';
        message = 'Congratulations! Your vendor account has been approved. You can now start adding products and services.';
      } else if (status === 'rejected') {
        title = 'Account Application Update';
        message = `Your vendor application was not approved. ${reason ? `Reason: ${reason}` : 'Please contact support for more details.'}`;
      }

      await notificationService.createNotification({
        recipientId: id,
        recipientType: 'vendor',
        type: 'system',
        title: title,
        message: message,
        actionUrl: status === 'approved' ? '/vendor/dashboard' : '/vendor/profile',
      }, req.app.get('io'));
    } catch (notifError) {
      console.error('Failed to send vendor status notification:', notifError);
    }

    // Clear vendor cache
    await clearVendorCache(id);

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

    // Clear vendor cache
    await clearVendorCache(id);

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
 * Toggle vendor active status
 * PATCH /api/admin/vendors/:id/toggle-active
 */
export const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await toggleVendorActive(id);

    // Notify vendor about activation/deactivation
    try {
      await notificationService.createNotification({
        recipientId: id,
        recipientType: 'vendor',
        type: 'system',
        title: vendor.isActive ? 'Account Activated' : 'Account Deactivated',
        message: vendor.isActive
          ? 'Your account has been activated by the administrator.'
          : 'Your account has been deactivated. Please contact support if you believe this is a mistake.',
        actionUrl: '/vendor/profile',
      }, req.app.get('io'));
    } catch (notifError) {
      console.error('Failed to send vendor activation notification:', notifError);
    }

    // Clear vendor cache
    await clearVendorCache(id);

    res.status(200).json({
      success: true,
      message: `Vendor ${vendor.isActive ? 'activated' : 'deactivated'} successfully`,
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
 * Get B2B vendors with subscription information
 * GET /api/admin/b2b-vendors
 */
export const getB2BVendorsList = async (req, res, next) => {
  try {
    const {
      status = 'all',
      search = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getB2BVendors({
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'B2B vendors retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending B2B vendors
 * GET /api/admin/b2b-vendors/pending
 */
export const getPendingB2BVendors = async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    console.log('Fetching pending B2B vendors:', { search, page, limit });

    const result = await getB2BVendors({
      status: 'pending',
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    console.log('Pending B2B vendors fetched:', { count: result.vendors?.length || 0, total: result.total });

    res.status(200).json({
      success: true,
      message: 'Pending B2B vendors retrieved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in getPendingB2BVendors:', error);
    next(error);
  }
};

/**
 * Delete B2B vendor
 * DELETE /api/admin/b2b-vendors/:id
 */
export const removeB2BVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteB2BVendor(id);

    res.status(200).json({
      success: true,
      message: 'B2B Vendor deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get signed document URL
 * POST /api/admin/b2b-vendors/document-url
 */
export const getSignedDocumentUrl = async (req, res, next) => {
  try {
    const { url, publicId, download = false, format, resourceType, filename } = req.body;

    // We prefer publicId, but if only url is provided, we'll try to use it directly 
    // or extract publicId if possible, though backend extraction is safer.
    // For now, let's assume the frontend sends the publicId if available, 
    // or we might need to rely on the URL if it's a private URL we just want to sign.

    // Actually, getSignedUrl deals with publicId.
    // If we receive a full URL, we might need to extract the publicId.
    // Let's rely on the frontend sending the publicId if possible, 
    // or we try to extract it here if 'url' is sent.

    const idToSign = publicId || (url ? url.split('/').pop().split('.')[0] : null);
    // Simple split might fail for complex URLs, but let's see. 
    // Better to use the util's extractor if we had exported it.
    // But wait, the frontend has the publicId usually.

    if (!url && !publicId) {
      return res.status(400).json({
        success: false,
        message: 'URL or Public ID is required'
      });
    }

    // Pass options to getSignedUrl
    // If it's a PDF, we might want format: 'pdf' explicitly if using public_id
    const options = {
      download: download === true,
      resource_type: resourceType || 'image', // Use provided resource type or default to image
    };

    // If downloading, try to provide a friendly filename
    if (download && filename) {
      // Sanitize filename
      let safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      // Ensure extension exists if we know the format or it's PDF
      if (resourceType === 'raw' || format === 'pdf' || (url && url.toLowerCase().endsWith('.pdf'))) {
        if (!safeFilename.toLowerCase().endsWith('.pdf')) {
          safeFilename += '.pdf';
        }
      }

      options.attachment_filename = safeFilename;
    }

    if (format) {
      options.format = format;
    }

    // Use the url/publicId passed
    const signedUrl = getSignedUrl(publicId || url, options);

    res.status(200).json({
      success: true,
      data: {
        signedUrl
      }
    });

  } catch (error) {
    console.error('Error in getSignedDocumentUrl:', error);
    next(error);
  }
};

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
import Product from '../models/Product.model.js';
import Property from '../models/Property.model.js';
import LotSlot from '../models/LotSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Notification from '../models/Notification.model.js';
import Vendor from '../models/Vendor.model.js';
import ShopUnit from '../models/ShopUnit.model.js';

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
    const { status, reason, isActive } = req.body;

    const vendor = await updateVendorStatus(id, status, reason, isActive);

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

/**
 * Get Specific B2B Vendor Dashboard Data (For Admin)
 * GET /api/admin/b2b-vendors/:id/dashboard
 */
export const getVendorDashboardForAdmin = async (req, res, next) => {
  try {
    const vendorId = req.params.id;

    const [
      vendor,
      totalProducts, approvedProducts,
      totalProperties, approvedProperties,
      totalLotSlots, approvedLotSlots,
      activeBanners,
      subscriptions,
      notifications,
      vendorAnalytics,
      shopUnit
    ] = await Promise.all([
      Vendor.findById(vendorId).select('name storeName businessType businessTypeRef email').lean(),
      Product.countDocuments({ vendorId }),
      Product.countDocuments({ vendorId, isActive: true }),
      Property.countDocuments({ vendorId }),
      Property.countDocuments({ vendorId, isActive: true }),
      LotSlot.countDocuments({ vendorId }),
      LotSlot.countDocuments({ vendorId, isActive: true }),
      BannerBooking.find({ vendorId, status: 'active' }).populate('slotId').lean(),
      VendorSubscription.find({ vendorId, status: 'active' }).populate('planId').lean(),
      Notification.find({ recipient: vendorId, recipientType: 'vendor' }).sort({ createdAt: -1 }).limit(5).lean(),
      Vendor.findById(vendorId).select('analytics').lean(),
      ShopUnit.findOne({ vendorId }).lean()
    ]);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Format Data for Frontend
    const dashboardData = {
      vendor,
      shopUnit: shopUnit ? {
        name: shopUnit.name,
        description: shopUnit.description,
        details: shopUnit.details || [],
        minPrice: shopUnit.minPrice,
        maxPrice: shopUnit.maxPrice
      } : null,
      overview: {
        bannerClicks: 0,
        callClicks: vendorAnalytics?.analytics?.callClicks || 0,
        whatsappClicks: vendorAnalytics?.analytics?.whatsappClicks || 0,
        mapClicks: vendorAnalytics?.analytics?.mapClicks || 0
      },
      counts: {
        products: {
          total: totalProducts,
          approved: approvedProducts,
          pending: totalProducts - approvedProducts
        },
        properties: {
          total: totalProperties,
          approved: approvedProperties,
          pending: totalProperties - approvedProperties
        },
        lotSlot: {
          total: totalLotSlots,
          approved: approvedLotSlots,
          pending: totalLotSlots - approvedLotSlots
        }
      },
      subscriptions: subscriptions.map(sub => ({
        type: sub.planId?.businessType || 'unknown',
        name: sub.planId?.name || 'Active Plan',
        status: sub.status === 'active' ? 'Active' : 'Expiring Soon',
        expiry: sub.endDate,
        daysLeft: Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      })),
      banners: activeBanners.map(b => ({
        title: b.title || 'Active Banner',
        type: b.slotId?.name || 'Banner',
        expiry: b.endDate
      })),
      alerts: notifications.map(n => ({
        id: n._id,
        type: n.priority === 'high' ? 'warning' : 'info',
        message: n.message
      }))
    };

    // Add expiry alerts
    dashboardData.subscriptions.forEach(sub => {
      if (sub.daysLeft <= 7) {
        dashboardData.alerts.push({
          id: `expiry-${sub.type}`,
          type: 'warning',
          message: `Vendor's "${sub.name}" plan is expiring in ${sub.daysLeft} days.`
        });
      }
    });

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching vendor dashboard for admin:', error);
    next(error);
  }
};

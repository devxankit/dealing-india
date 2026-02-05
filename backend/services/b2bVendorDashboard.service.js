import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Get B2B Vendor Dashboard Data
 * @param {string} vendorId - B2B Vendor ID
 * @param {string} period - Time period (optional, not used for B2B but kept for consistency)
 * @returns {Promise<Object>} Dashboard data with metrics, recent inquiries, and top products
 */
export const getB2BVendorDashboardData = async (vendorId, period = 'month') => {
  try {
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // Verify vendor is B2B
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      const err = new Error('Vendor not found');
      err.status = 404;
      throw err;
    }
    if (vendor.vendorType !== 'b2b') {
      const err = new Error('Access denied. This endpoint is only for B2B vendors.');
      err.status = 403;
      throw err;
    }

    // Simplified query for B2B Vendor Dashboard
    const totalProducts = await Product.countDocuments({
      vendorId: vendorObjectId,
      isActive: true
    });

    // Return dashboard data with inquiries/chats removed
    return {
      metrics: {
        totalProducts,
        totalInquiries: 0,
        activeConversations: 0
      },
      recentInquiries: [],
      topProducts: [],
      charts: {
        inquiryTrends: [],
        categoryDistribution: []
      }
    };
  } catch (error) {
    console.error('Error in getB2BVendorDashboardData:', error);
    throw error;
  }
};

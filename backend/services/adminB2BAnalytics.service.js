import mongoose from 'mongoose';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';

/**
 * Get Admin B2B Vendor Analytics
 * @param {string} period - Time period (today, week, month, year)
 * @returns {Promise<Object>} B2B analytics data
 */
export const getAdminB2BAnalytics = async (period = 'month') => {
  try {
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 1, 2, 3. Fetch base data in parallel
    const [totalB2BVendors, b2bVendorsInPeriod, b2bVendorIds] = await Promise.all([
      Vendor.countDocuments({ vendorType: 'b2b' }),
      Vendor.countDocuments({
        vendorType: 'b2b',
        createdAt: { $gte: startDate }
      }),
      Vendor.find({ vendorType: 'b2b' }).select('_id').lean()
    ]);

    const b2bVendorObjectIds = b2bVendorIds.map(v => v._id);

    // 4-8. Fetch remaining analytics data in parallel
    const [
      totalB2BProducts,
      productsInPeriod,
      totalB2BMessages,
      messagesInPeriod,
      onboardingTrend,
      b2BOrdersResult,
      transactionVolumeTrendResult
    ] = await Promise.all([
      Product.countDocuments({
        vendorId: { $in: b2bVendorObjectIds },
        isActive: true
      }),
      Product.countDocuments({
        vendorId: { $in: b2bVendorObjectIds },
        isActive: true,
        createdAt: { $gte: startDate }
      }),
      Message.countDocuments({
        $or: [
          { senderRole: 'vendor', 'senderId': { $in: b2bVendorObjectIds } },
          { receiverRole: 'vendor', 'receiverId': { $in: b2bVendorObjectIds } }
        ]
      }),
      Message.countDocuments({
        $or: [
          { senderRole: 'vendor', 'senderId': { $in: b2bVendorObjectIds }, createdAt: { $gte: startDate } },
          { receiverRole: 'vendor', 'receiverId': { $in: b2bVendorObjectIds }, createdAt: { $gte: startDate } }
        ]
      }),
      Vendor.aggregate([
        { $match: { vendorType: 'b2b', createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: period === 'year' ? '%Y-%m' : '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      // B2B Volume (revenue)
      (async () => {
        try {
          const Order = (await import('../models/Order.model.js')).default;
          return await Order.aggregate([
            { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds }, status: { $ne: 'cancelled' } } },
            { $unwind: '$vendorBreakdown' },
            { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds } } },
            { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
          ]);
        } catch (e) { return []; }
      })(),
      // Transaction Volume Trend
      (async () => {
        try {
          const Order = (await import('../models/Order.model.js')).default;
          return await Order.aggregate([
            { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds }, status: { $ne: 'cancelled' }, createdAt: { $gte: startDate } } },
            { $unwind: '$vendorBreakdown' },
            { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds } } },
            { $group: { _id: { $dateToString: { format: period === 'year' ? '%Y-%m' : '%Y-%m-%d', date: '$createdAt' } }, volume: { $sum: '$vendorBreakdown.subtotal' } } },
            { $sort: { _id: 1 } }
          ]);
        } catch (e) { return []; }
      })()
    ]);

    const b2BVolume = b2BOrdersResult[0]?.total || 0;
    const transactionVolumeTrend = transactionVolumeTrendResult;

    // Format chart data
    const formatChartData = (data, dateKey = '_id', valueKey = 'count') => {
      return data.map(item => ({
        date: item[dateKey],
        value: item[valueKey] || 0
      }));
    };

    return {
      metrics: {
        totalB2BVendors,
        b2bVendorsInPeriod,
        totalB2BProducts,
        productsInPeriod,
        totalB2BMessages,
        messagesInPeriod,
        b2BVolume
      },
      trends: {
        vendors: calculateTrend(b2bVendorsInPeriod),
        products: calculateTrend(productsInPeriod),
        messages: calculateTrend(messagesInPeriod)
      },
      formatted: {
        totalB2BVendors: totalB2BVendors.toString(),
        b2BVolume: formatVolume(b2BVolume),
        totalB2BProducts: totalB2BProducts.toLocaleString('en-IN'),
        totalB2BMessages: totalB2BMessages >= 1000 ? `${(totalB2BMessages / 1000).toFixed(1)}K` : totalB2BMessages.toString()
      },
      charts: {
        onboardingTrend: formatChartData(onboardingTrend),
        transactionVolumeTrend: formatChartData(transactionVolumeTrend, '_id', 'volume')
      }
    };
  } catch (error) {
    console.error('Error in getAdminB2BAnalytics:', error);
    throw error;
  }
};

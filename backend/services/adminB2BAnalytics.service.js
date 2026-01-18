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

    // 1. Total B2B Vendors (all time)
    const totalB2BVendors = await Vendor.countDocuments({ vendorType: 'b2b' });

    // 2. B2B Vendors in period (for trend calculation)
    const b2bVendorsInPeriod = await Vendor.countDocuments({
      vendorType: 'b2b',
      createdAt: { $gte: startDate }
    });

    // 3. Total B2B Products (all time)
    const b2bVendorIds = await Vendor.find({ vendorType: 'b2b' }).select('_id').lean();
    const b2bVendorObjectIds = b2bVendorIds.map(v => v._id);
    const totalB2BProducts = await Product.countDocuments({
      vendorId: { $in: b2bVendorObjectIds },
      isActive: true
    });

    // 4. Products in period
    const productsInPeriod = await Product.countDocuments({
      vendorId: { $in: b2bVendorObjectIds },
      isActive: true,
      createdAt: { $gte: startDate }
    });

    // 5. Total B2B Messages (all conversations with B2B vendors)
    const totalB2BMessages = await Message.countDocuments({
      $or: [
        {
          senderRole: 'vendor',
          'senderId': { $in: b2bVendorObjectIds }
        },
        {
          receiverRole: 'vendor',
          'receiverId': { $in: b2bVendorObjectIds }
        }
      ]
    });

    // Messages in period
    const messagesInPeriod = await Message.countDocuments({
      $or: [
        {
          senderRole: 'vendor',
          'senderId': { $in: b2bVendorObjectIds },
          createdAt: { $gte: startDate }
        },
        {
          receiverRole: 'vendor',
          'receiverId': { $in: b2bVendorObjectIds },
          createdAt: { $gte: startDate }
        }
      ]
    });

    // 6. Calculate B2B Volume (revenue) - if you have Order model with B2B orders
    // For now, using messages as a proxy, but you can extend this with actual order data
    let b2BVolume = 0;
    try {
      const Order = (await import('../models/Order.model.js')).default;
      const b2BOrders = await Order.aggregate([
        {
          $match: {
            'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds },
            status: { $ne: 'cancelled' }
          }
        },
        { $unwind: '$vendorBreakdown' },
        {
          $match: {
            'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$vendorBreakdown.subtotal' }
          }
        }
      ]);
      b2BVolume = b2BOrders[0]?.total || 0;
    } catch (error) {
      // If Order model not available or no orders, use 0
      console.log('B2B Volume calculation: Order model not available or no orders');
    }

    // Format volume in Crores
    const formatVolume = (amount) => {
      if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(1)}Cr`;
      } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`;
      } else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
      }
      return `₹${amount}`;
    };

    // Calculate trends (simple - can be improved with previous period comparison)
    const calculateTrend = (current, previous = 0) => {
      if (previous === 0) return current > 0 ? `+${current}` : '0';
      const change = current - previous;
      if (change === 0) return '0';
      if (change > 0) return `+${change}`;
      return `${change}`;
    };

    // 7. Get onboarding trend data (vendors registered over time)
    const onboardingTrend = await Vendor.aggregate([
      {
        $match: {
          vendorType: 'b2b',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: period === 'year' ? '%Y-%m' : period === 'month' ? '%Y-%m-%d' : '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 8. Get transaction volume trend data
    let transactionVolumeTrend = [];
    try {
      const Order = (await import('../models/Order.model.js')).default;
      transactionVolumeTrend = await Order.aggregate([
        {
          $match: {
            'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds },
            status: { $ne: 'cancelled' },
            createdAt: { $gte: startDate }
          }
        },
        { $unwind: '$vendorBreakdown' },
        {
          $match: {
            'vendorBreakdown.vendorId': { $in: b2bVendorObjectIds }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: period === 'year' ? '%Y-%m' : period === 'month' ? '%Y-%m-%d' : '%Y-%m-%d', date: '$createdAt' }
            },
            volume: { $sum: '$vendorBreakdown.subtotal' }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    } catch (error) {
      console.log('Transaction volume trend calculation: Order model not available');
    }

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

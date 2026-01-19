import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Get B2B Vendor Dashboard Data
 * @param {string} vendorId - B2B Vendor ID
 * @param {string} period - Time period (optional, not used for B2B but kept for consistency)
 * @returns {Promise<Object>} Dashboard data with metrics, recent inquiries, and top products
 */
export const getB2BVendorDashboardData = async (vendorId, period = 'month') => {
  try {
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      const err = new Error('Invalid Vendor ID format');
      err.status = 400;
      throw err;
    }
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

    // 1. Get total products count for this vendor
    const totalProducts = await Product.countDocuments({
      vendorId: vendorObjectId,
      isActive: true
    });

    // 2. Get vendor's conversations (chats with users)
    const conversations = await Chat.find({
      'participants.userId': vendorObjectId,
      'participants.role': 'vendor'
    })
      .populate({
        path: 'participants.userId',
        select: 'name email storeName storeLogo businessName'
      })
      .populate('lastMessage')
      .lean();

    // 3. Get all inquiry messages for this vendor
    // Inquiries are messages where:
    // - receiverId is the vendor AND receiverRole is 'vendor'
    // - messageType is 'inquiry' OR metadata contains productId
    const inquiryMessages = await Message.find({
      receiverId: vendorObjectId,
      receiverRole: 'vendor',
      $or: [
        { messageType: 'inquiry' },
        { 'metadata.productId': { $exists: true } }
      ]
    })
      .populate('senderId', 'name email storeName businessName')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .lean();

    // Count total inquiries
    const totalInquiries = inquiryMessages.length;

    // Count active conversations (conversations with at least one message)
    const activeConversations = conversations.filter(conv => conv.lastMessage).length;

    // 4. Get recent inquiries (last 10)
    // First, get conversation IDs for inquiries
    // Safely extract ID whether conversationId is populated or not
    const inquiryConversationIds = [...new Set(inquiryMessages.map(msg => {
      const id = msg.conversationId?._id || msg.conversationId;
      return id ? id.toString() : null;
    }).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];

    // Get conversations with last message to determine status
    const inquiryConversations = await Chat.find({
      _id: { $in: inquiryConversationIds.map(id => new mongoose.Types.ObjectId(id)) }
    })
      .populate('lastMessage')
      .lean();

    const conversationMap = new Map();
    inquiryConversations.forEach(conv => {
      conversationMap.set(conv._id.toString(), conv);
    });

    const recentInquiries = inquiryMessages.slice(0, 10).map(msg => {
      const sender = msg.senderId;
      const productName = msg.metadata?.productName ||
        (msg.message?.match(/INQUIRY FOR: (.+?)\*/)?.[1]) ||
        'Product Inquiry';

      // Determine status: if last message in conversation is from vendor, status is 'responded', else 'new'
      const conversationId = (msg.conversationId?._id || msg.conversationId)?.toString();
      const conversation = conversationId ? conversationMap.get(conversationId) : null;
      const lastMessage = conversation?.lastMessage;

      // If last message is from vendor (receiverRole or senderRole), status is 'responded'
      // Otherwise, status is 'new'
      const status = lastMessage?.senderRole === 'vendor' ? 'responded' : 'new';

      return {
        id: msg._id?.toString() || conversationId,
        vendor: sender?.storeName || sender?.businessName || sender?.name || 'Unknown Buyer',
        product: productName,
        date: msg.createdAt || new Date(),
        status: status
      };
    });

    // 5. Get top products (products with most inquiries)
    // Group inquiries by productId
    const productInquiryCounts = {};
    inquiryMessages.forEach(msg => {
      const productId = msg.metadata?.productId;
      if (productId) {
        const pid = productId.toString();
        productInquiryCounts[pid] = (productInquiryCounts[pid] || 0) + 1;
      }
    });

    // Get top product IDs (sorted by inquiry count)
    const topProductIds = Object.entries(productInquiryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([productId]) => productId)
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // Fetch top products
    const topProductsData = await Product.find({
      _id: { $in: topProductIds },
      vendorId: vendorObjectId
    })
      .select('name images image')
      .lean();

    // Map products with inquiry counts and visibility
    const topProducts = topProductIds.map(productId => {
      const product = topProductsData.find(p => p._id.toString() === productId.toString());
      if (!product) return null;

      const inquiryCount = productInquiryCounts[productId.toString()] || 0;

      return {
        id: product._id?.toString(),
        name: product.name,
        inquiries: inquiryCount,
        visibility: inquiryCount >= 10 ? 'High' : inquiryCount >= 5 ? 'Medium' : 'Low'
      };
    }).filter(Boolean);

    // 6. Get inquiry trends data (inquiries over time)
    const calculateDateRange = (period) => {
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
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      return startDate;
    };

    const periodStartDate = calculateDateRange(period);

    const inquiryTrends = await Message.aggregate([
      {
        $match: {
          receiverId: vendorObjectId,
          receiverRole: 'vendor',
          createdAt: { $gte: periodStartDate },
          $or: [
            { messageType: 'inquiry' },
            { 'metadata.productId': { $exists: true } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : period === 'month' ? '%Y-%m-%d' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 7. Get category distribution data (top performing categories)
    // First get all products with their categories
    const allProducts = await Product.find({
      vendorId: vendorObjectId,
      isActive: true
    })
      .select('_id attributes')
      .lean();

    // Get inquiry counts per product
    const productInquiryCountsMap = {};
    inquiryMessages.forEach(msg => {
      const productId = msg.metadata?.productId;
      if (productId) {
        const pid = productId.toString();
        productInquiryCountsMap[pid] = (productInquiryCountsMap[pid] || 0) + 1;
      }
    });

    // Group by category
    const categoryData = {};
    allProducts.forEach(product => {
      const categoryAttr = product.attributes?.find(attr =>
        attr.name?.toLowerCase() === 'category'
      );
      const category = categoryAttr?.value || 'Other';

      if (!categoryData[category]) {
        categoryData[category] = {
          name: category,
          products: 0,
          inquiries: 0
        };
      }

      categoryData[category].products += 1;

      const productId = product._id.toString();
      if (productInquiryCountsMap[productId]) {
        categoryData[category].inquiries += productInquiryCountsMap[productId];
      }
    });

    // Convert to array and sort by inquiries (or products if no inquiries)
    const categoryDistributionWithInquiries = Object.values(categoryData)
      .sort((a, b) => (b.inquiries || 0) - (a.inquiries || 0) || b.products - a.products)
      .slice(0, 10);

    // Return dashboard data
    return {
      metrics: {
        totalProducts,
        totalInquiries,
        activeConversations
      },
      recentInquiries,
      topProducts,
      charts: {
        inquiryTrends: inquiryTrends.map(item => ({
          date: item._id,
          inquiries: item.count
        })),
        categoryDistribution: categoryDistributionWithInquiries
      }
    };
  } catch (error) {
    console.error('Error in getB2BVendorDashboardData:', error);
    throw error;
  }
};

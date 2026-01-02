import Campaign from '../models/Campaign.model.js';
import Product from '../models/Product.model.js';

/**
 * Calculate campaign status based on dates
 */
const calculateCampaignStatus = (campaign) => {
  const now = new Date();
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);

  if (!campaign.isActive) {
    return 'inactive';
  }
  if (startDate > now) {
    return 'upcoming';
  }
  if (endDate >= now) {
    return 'active';
  }
  return 'expired';
};

/**
 * Get all active campaigns for public (users)
 * @param {Object} filters - { type, page, limit }
 * @returns {Promise<Object>} { campaigns, total, page, totalPages }
 */
export const getPublicCampaigns = async (filters = {}) => {
  try {
    const { type, page = 1, limit = 100 } = filters;

    const now = new Date();
    // Set to start of day to ensure campaigns show for the entire day
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Set to end of day to ensure campaigns show until end of their end date
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Build query - only active campaigns that are currently running
    // Use startOfToday for startDate check and endOfToday for endDate check
    // This ensures campaigns show for the entire day
    const query = {
      isActive: true,
      startDate: { $lte: endOfToday }, // Campaign should have started by end of today
      endDate: { $gte: startOfToday }, // Campaign should end on or after start of today
    };

    // Type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate({
          path: 'productIds',
          match: { isActive: true, isVisible: true },
          select: 'name price image originalPrice discount vendorId categoryId rating reviewCount stock isActive isVisible',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(query),
    ]);

    // Transform campaigns with status and products
    const campaignsWithStatus = campaigns.map((campaign) => {
      // Filter out null products (from populate match)
      const validProducts = (campaign.productIds || []).filter(p => p !== null);

      return {
        ...campaign,
        id: campaign._id.toString(),
        status: calculateCampaignStatus(campaign),
        discount: campaign.discountValue,
        productIds: validProducts.map(p => p._id.toString()),
        products: validProducts.map(product => ({
          id: product._id.toString(),
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice || product.price,
          image: product.image,
          discount: product.discount || 0,
          vendorId: product.vendorId?.toString() || product.vendorId,
          categoryId: product.categoryId?.toString() || product.categoryId,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          stock: product.stock || 0,
        })),
        productCount: validProducts.length,
        bannerConfig: campaign.bannerConfig || {},
        route: campaign.route || `/campaign/${campaign.slug || campaign._id}`,
      };
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      campaigns: campaignsWithStatus,
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
 * Get campaign by ID or slug for public
 * @param {String} identifier - Campaign ID or slug
 * @returns {Promise<Object>} Campaign object
 */
export const getPublicCampaignById = async (identifier) => {
  try {
    const now = new Date();
    // Set to start of day to ensure campaigns show for the entire day
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Set to end of day to ensure campaigns show until end of their end date
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Try to find by ID first, then by slug
    let campaign = null;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      // Valid ObjectId format
      campaign = await Campaign.findOne({
        _id: identifier,
        isActive: true,
        startDate: { $lte: endOfToday }, // Campaign should have started by end of today
        endDate: { $gte: startOfToday }, // Campaign should end on or after start of today
      })
        .populate({
          path: 'productIds',
          match: { isActive: true, isVisible: true },
          select: 'name price image originalPrice discount vendorId categoryId rating reviewCount stock isActive isVisible',
        })
        .lean();
    } else {
      // Try by slug
      campaign = await Campaign.findOne({
        slug: identifier,
        isActive: true,
        startDate: { $lte: endOfToday }, // Campaign should have started by end of today
        endDate: { $gte: startOfToday }, // Campaign should end on or after start of today
      })
        .populate({
          path: 'productIds',
          match: { isActive: true, isVisible: true },
          select: 'name price image originalPrice discount vendorId categoryId rating reviewCount stock isActive isVisible',
        })
        .lean();
    }

    if (!campaign) {
      const error = new Error('Campaign not found or not available');
      error.statusCode = 404;
      throw error;
    }

    // Filter out null products
    const validProducts = (campaign.productIds || []).filter(p => p !== null);

    return {
      ...campaign,
      id: campaign._id.toString(),
      status: calculateCampaignStatus(campaign),
      discount: campaign.discountValue,
      productIds: validProducts.map(p => p._id.toString()),
      products: validProducts.map(product => ({
        id: product._id.toString(),
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice || product.price,
        image: product.image,
        discount: product.discount || 0,
        vendorId: product.vendorId?.toString() || product.vendorId,
        categoryId: product.categoryId?.toString() || product.categoryId,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        stock: product.stock || 0,
      })),
      productCount: validProducts.length,
      bannerConfig: campaign.bannerConfig || {},
      route: campaign.route || `/campaign/${campaign.slug || campaign._id}`,
    };
  } catch (error) {
    throw error;
  }
};


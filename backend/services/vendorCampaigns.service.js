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
 * Get all campaigns available for vendors (active campaigns only)
 * @param {String} vendorId - Vendor ID (optional, for filtering vendor's products)
 * @param {Object} filters - { search, status, type, page, limit }
 * @returns {Promise<Object>} { campaigns, total, page, totalPages }
 */
export const getVendorCampaigns = async (vendorId, filters = {}) => {
  try {
    const {
      search = '',
      status,
      type,
      page = 1,
      limit = 100,
    } = filters;

    const now = new Date();

    // Build query - only active campaigns
    const query = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    // Type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get vendor's product IDs if vendorId is provided
    let vendorProductIds = [];
    if (vendorId) {
      const vendorProducts = await Product.find({
        vendorId,
        isActive: true,
      }).select('_id').lean();
      vendorProductIds = vendorProducts.map(p => p._id.toString());
    }

    // Execute query
    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('productIds', 'name price image vendorId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(query),
    ]);

    // Transform campaigns with status
    const campaignsWithStatus = campaigns.map((campaign) => {
      // Filter products by vendor if vendorId is provided
      let products = campaign.productIds || [];
      let productCount = products.length;
      
      if (vendorId && products.length > 0 && vendorProductIds.length > 0) {
        // Filter products that belong to this vendor
        products = products.filter((product) => {
          const productId = product._id?.toString() || product.toString();
          return vendorProductIds.includes(productId);
        });
        
        productCount = products.length;
      }

      return {
        ...campaign,
        id: campaign._id.toString(),
        status: calculateCampaignStatus(campaign),
        discount: campaign.discountValue,
        productIds: products.map(p => p._id?.toString() || p.toString()),
        productCount: productCount,
      };
    });

    // Filter by status if provided
    let filteredCampaigns = campaignsWithStatus;
    if (status && status !== 'all') {
      filteredCampaigns = campaignsWithStatus.filter(c => c.status === status);
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      campaigns: filteredCampaigns,
      total: filteredCampaigns.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get campaign by ID for vendor
 * @param {String} campaignId - Campaign ID
 * @param {String} vendorId - Vendor ID (optional)
 * @returns {Promise<Object>} Campaign object
 */
export const getVendorCampaignById = async (campaignId, vendorId) => {
  try {
    const now = new Date();

    const campaign = await Campaign.findOne({
      _id: campaignId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('productIds', 'name price image vendorId')
      .lean();

    if (!campaign) {
      const error = new Error('Campaign not found or not available');
      error.statusCode = 404;
      throw error;
    }

    // Get vendor's product IDs if vendorId is provided
    let vendorProductIds = [];
    if (vendorId) {
      const vendorProducts = await Product.find({
        vendorId,
        isActive: true,
      }).select('_id').lean();
      vendorProductIds = vendorProducts.map(p => p._id.toString());
    }

    // Filter products by vendor if vendorId is provided
    let products = campaign.productIds || [];
    let productCount = products.length;
    
    if (vendorId && products.length > 0 && vendorProductIds.length > 0) {
      // Filter products that belong to this vendor
      products = products.filter((product) => {
        const productId = product._id?.toString() || product.toString();
        return vendorProductIds.includes(productId);
      });
      
      productCount = products.length;
    }

    return {
      ...campaign,
      id: campaign._id.toString(),
      status: calculateCampaignStatus(campaign),
      discount: campaign.discountValue,
      productIds: products.map(p => p._id?.toString() || p.toString()),
      productCount: productCount,
    };
  } catch (error) {
    throw error;
  }
};


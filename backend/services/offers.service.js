import mongoose from 'mongoose';
import Campaign from '../models/Campaign.model.js';
import Banner from '../models/Banner.model.js';

/**
 * Generate URL-friendly slug from name
 */
const generateSlug = (name, existingCampaigns = []) => {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  let uniqueSlug = slug;
  let counter = 1;
  while (existingCampaigns.some((c) => c.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

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
 * Get default page config
 */
const getDefaultPageConfig = () => ({
  showCountdown: true,
  countdownType: 'campaign_end',
  viewModes: ['grid', 'list'],
  defaultViewMode: 'grid',
  enableFilters: true,
  enableSorting: true,
  productsPerPage: 12,
  showStats: true,
});

/**
 * Get all campaigns (offers) with filters
 */
export const getAllCampaigns = async (filters = {}) => {
  try {
    const { type, page = 1, limit = 100 } = filters;

    const query = {};
    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('productIds', 'name price image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(query),
    ]);

    const campaignsWithStatus = campaigns.map((campaign) => ({
      ...campaign,
      id: campaign._id.toString(),
      status: calculateCampaignStatus(campaign),
      discount: campaign.discountValue,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    }));

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
 * Get campaign by ID
 */
export const getCampaignById = async (campaignId) => {
  try {
    // Validate campaignId format
    if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
      const error = new Error('Invalid campaign ID format');
      error.statusCode = 400;
      throw error;
    }

    const campaign = await Campaign.findById(campaignId).lean();

    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    // Populate products separately with error handling
    let populatedProducts = [];
    if (campaign.productIds && campaign.productIds.length > 0) {
      try {
        const Product = (await import('../models/Product.model.js')).default;
        const productDocs = await Product.find({
          _id: { $in: campaign.productIds },
          isActive: true,
          isVisible: true
        })
          .select('name price image originalPrice stock stockQuantity categoryId brandId isVisible isActive')
          .lean();

        // Map to IDs only
        populatedProducts = productDocs.map(p => p._id.toString());
      } catch (populateError) {
        console.error('Error populating products:', populateError);
        // Continue with campaign data even if products fail to populate
        populatedProducts = campaign.productIds.map(id => id.toString());
      }
    }

    return {
      ...campaign,
      id: campaign._id.toString(),
      _id: campaign._id,
      status: calculateCampaignStatus(campaign),
      discount: campaign.discountValue,
      // Return only valid product IDs
      productIds: populatedProducts,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      const castError = new Error('Invalid campaign ID');
      castError.statusCode = 400;
      throw castError;
    }
    // Log error for debugging
    console.error('Error in getCampaignById:', error);
    throw error;
  }
};

/**
 * Create campaign
 */
export const createCampaign = async (campaignData) => {
  try {
    // Validate discountValue
    const discountValue = parseFloat(campaignData.discountValue);
    if (isNaN(discountValue) || discountValue < 0) {
      const error = new Error('Invalid discount value. Must be a positive number.');
      error.statusCode = 400;
      throw error;
    }

    const existingCampaigns = await Campaign.find().lean();
    const slug = campaignData.slug || generateSlug(campaignData.name, existingCampaigns);

    const pageConfig = {
      ...getDefaultPageConfig(),
      ...(campaignData.pageConfig || {}),
    };

    const newCampaign = new Campaign({
      name: campaignData.name,
      slug,
      route: `/sale/${slug}`,
      type: campaignData.type,
      description: campaignData.description || '',
      discountType: campaignData.discountType,
      discountValue: discountValue,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      productIds: campaignData.productIds || [],
      isActive: campaignData.isActive !== undefined ? campaignData.isActive : true,
      pageConfig,
      bannerConfig: campaignData.bannerConfig || {
        title: '',
        subtitle: '',
        imageUrl: '',
        imagePublicId: null,
        customImage: false,
      },
      autoCreateBanner: campaignData.autoCreateBanner !== undefined ? campaignData.autoCreateBanner : true,
    });

    await newCampaign.save();

    // Auto-create banner if enabled
    if (newCampaign.autoCreateBanner && campaignData.bannerConfig) {
      try {
        const banner = new Banner({
          type: 'promotional',
          title: campaignData.bannerConfig.title || newCampaign.name,
          subtitle: campaignData.bannerConfig.subtitle || `${newCampaign.discountValue}% OFF`,
          image: campaignData.bannerConfig.imageUrl || '',
          link: newCampaign.route,
          order: 1,
          isActive: true,
        });
        await banner.save();
      } catch (bannerError) {
        console.error('Failed to create banner:', bannerError);
        // Don't fail campaign creation if banner fails
      }
    }

    const savedCampaign = await Campaign.findById(newCampaign._id)
      .populate('productIds', 'name price image')
      .lean();

    return {
      ...savedCampaign,
      id: savedCampaign._id.toString(),
      status: calculateCampaignStatus(savedCampaign),
      discount: savedCampaign.discountValue,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Campaign slug already exists');
    }
    throw error;
  }
};

/**
 * Update campaign
 */
export const updateCampaign = async (campaignId, updateData) => {
  try {
    // Validate campaignId format
    if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
      const error = new Error('Invalid campaign ID format');
      error.statusCode = 400;
      throw error;
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate and clean productIds
    if (updateData.productIds) {
      if (!Array.isArray(updateData.productIds)) {
        const error = new Error('productIds must be an array');
        error.statusCode = 400;
        throw error;
      }
      
      // Filter out invalid ObjectIds
      updateData.productIds = updateData.productIds.filter(id => {
        if (!id) return false;
        const idStr = id.toString();
        return mongoose.Types.ObjectId.isValid(idStr);
      }).map(id => {
        const idStr = id.toString();
        return mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null;
      }).filter(id => id !== null);
    }

    // Update slug if name changed
    if (updateData.name && updateData.name !== campaign.name) {
      const existingCampaigns = await Campaign.find({ _id: { $ne: campaignId } }).lean();
      updateData.slug = generateSlug(updateData.name, existingCampaigns);
      updateData.route = `/sale/${updateData.slug}`;
    }

    // Validate discountValue
    if (updateData.discountValue !== undefined) {
      const discountValue = parseFloat(updateData.discountValue);
      if (isNaN(discountValue) || discountValue < 0) {
        const error = new Error('Invalid discount value. Must be a positive number.');
        error.statusCode = 400;
        throw error;
      }
      updateData.discountValue = discountValue;
    }

    // Validate dates
    if (updateData.startDate) {
      const startDate = new Date(updateData.startDate);
      if (isNaN(startDate.getTime())) {
        const error = new Error('Invalid start date');
        error.statusCode = 400;
        throw error;
      }
      updateData.startDate = startDate;
    }

    if (updateData.endDate) {
      const endDate = new Date(updateData.endDate);
      if (isNaN(endDate.getTime())) {
        const error = new Error('Invalid end date');
        error.statusCode = 400;
        throw error;
      }
      updateData.endDate = endDate;
    }

    // Validate date range
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        const error = new Error('End date must be after start date');
        error.statusCode = 400;
        throw error;
      }
    }

    Object.assign(campaign, updateData);
    await campaign.save();

    const updatedCampaign = await Campaign.findById(campaignId)
      .populate('productIds', 'name price image')
      .lean();

    return {
      ...updatedCampaign,
      id: updatedCampaign._id.toString(),
      status: calculateCampaignStatus(updatedCampaign),
      discount: updatedCampaign.discountValue,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid campaign ID');
    }
    if (error.code === 11000) {
      throw new Error('Campaign slug already exists');
    }
    throw error;
  }
};

/**
 * Delete campaign
 */
export const deleteCampaign = async (campaignId) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid campaign ID');
    }
    throw error;
  }
};

/**
 * Toggle campaign status
 */
export const toggleCampaignStatus = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    const updatedCampaign = await Campaign.findById(campaignId)
      .populate('productIds', 'name price image')
      .lean();

    return {
      ...updatedCampaign,
      id: updatedCampaign._id.toString(),
      status: calculateCampaignStatus(updatedCampaign),
      discount: updatedCampaign.discountValue,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid campaign ID');
    }
    throw error;
  }
};


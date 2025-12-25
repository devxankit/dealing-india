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
    const { type, page = 1, limit = 10 } = filters;

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
    const campaign = await Campaign.findById(campaignId)
      .populate('productIds', 'name price image')
      .lean();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return {
      ...campaign,
      id: campaign._id.toString(),
      status: calculateCampaignStatus(campaign),
      discount: campaign.discountValue,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid campaign ID');
    }
    throw error;
  }
};

/**
 * Create campaign
 */
export const createCampaign = async (campaignData) => {
  try {
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
      discountValue: campaignData.discountValue,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      productIds: campaignData.productIds || [],
      isActive: campaignData.isActive !== undefined ? campaignData.isActive : true,
      pageConfig,
      bannerConfig: campaignData.bannerConfig || {
        title: '',
        subtitle: '',
        imageUrl: '',
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
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Update slug if name changed
    if (updateData.name && updateData.name !== campaign.name) {
      const existingCampaigns = await Campaign.find({ _id: { $ne: campaignId } }).lean();
      updateData.slug = generateSlug(updateData.name, existingCampaigns);
      updateData.route = `/sale/${updateData.slug}`;
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


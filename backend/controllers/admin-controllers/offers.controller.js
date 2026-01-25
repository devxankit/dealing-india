import mongoose from 'mongoose';
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  toggleCampaignStatus,
} from '../../services/offers.service.js';
import { upload } from '../../utils/upload.util.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../../utils/cloudinary.util.js';
import redisService from '../../services/redis.service.js';

/**
 * Helper to clear campaign-related cache
 */
const clearCampaignCache = async (campaignId = null) => {
  try {
    const patterns = [
      'public:campaigns:*',
      'products:list:*', // Campaigns affect product prices/visibility
      'admin:offers:list:*'
    ];

    if (campaignId) {
      patterns.push(`campaign:details:*${campaignId}*`);
      patterns.push(`admin:offers:details:*${campaignId}*`);
    } else {
      patterns.push('campaign:details:*');
      patterns.push('admin:offers:details:*');
    }

    await Promise.all(patterns.map(pattern => redisService.clearPattern(pattern)));
  } catch (error) {
    console.error('Error clearing campaign cache:', error);
  }
};

/**
 * Get all campaigns (offers)
 * GET /api/admin/offers
 */
export const getOffers = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const result = await getAllCampaigns({ type, page, limit });

    res.status(200).json({
      success: true,
      message: 'Offers retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get campaign by ID
 * GET /api/admin/offers/:id
 */
export const getOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await getCampaignById(id);

    res.status(200).json({
      success: true,
      message: 'Offer retrieved successfully',
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create campaign (offer)
 * POST /api/admin/offers
 */
export const createOffer = async (req, res, next) => {
  try {
    const campaignData = { ...req.body };

    // Handle image upload if present
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'offers'
        );
        const imageUrl = uploadResult.secure_url;
        const imagePublicId = uploadResult.public_id;

        if (campaignData.bannerConfig) {
          campaignData.bannerConfig.imageUrl = imageUrl;
          campaignData.bannerConfig.imagePublicId = imagePublicId;
          campaignData.bannerConfig.customImage = true;
        } else {
          campaignData.bannerConfig = {
            imageUrl,
            imagePublicId,
            customImage: true,
            title: '',
            subtitle: '',
          };
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    // Parse dates
    if (campaignData.startDate) {
      campaignData.startDate = new Date(campaignData.startDate);
    }
    if (campaignData.endDate) {
      campaignData.endDate = new Date(campaignData.endDate);
    }

    // Parse productIds if string array
    if (campaignData.productIds && typeof campaignData.productIds === 'string') {
      try {
        campaignData.productIds = JSON.parse(campaignData.productIds);
      } catch (e) {
        // Keep as is if not JSON
      }
    }

    // Parse pageConfig if string
    if (campaignData.pageConfig && typeof campaignData.pageConfig === 'string') {
      try {
        campaignData.pageConfig = JSON.parse(campaignData.pageConfig);
      } catch (e) {
        // Keep as is if not JSON
      }
    }

    // Parse bannerConfig if string
    if (campaignData.bannerConfig && typeof campaignData.bannerConfig === 'string') {
      try {
        campaignData.bannerConfig = JSON.parse(campaignData.bannerConfig);
      } catch (e) {
        // Keep as is if not JSON
      }
    }

    const campaign = await createCampaign(campaignData);

    // Clear campaign cache
    await clearCampaignCache();

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update campaign (offer)
 * PUT /api/admin/offers/:id
 */
export const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format first
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID format',
      });
    }

    const updateData = { ...req.body };

    // Get existing campaign to check for old image (with error handling)
    let existingCampaign;
    try {
      existingCampaign = await getCampaignById(id);
    } catch (error) {
      // If campaign not found, return 404
      if (error.statusCode === 404 || error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found',
        });
      }
      // For other errors, continue but log
      console.warn('Could not fetch existing campaign:', error.message);
    }

    // Handle image upload if present
    if (req.file) {
      try {
        // Upload new image to Cloudinary
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'offers'
        );
        const imageUrl = uploadResult.secure_url;
        const imagePublicId = uploadResult.public_id;

        // Delete old image from Cloudinary if it exists
        if (existingCampaign.bannerConfig?.imagePublicId) {
          await deleteFromCloudinary(existingCampaign.bannerConfig.imagePublicId);
        }

        if (updateData.bannerConfig) {
          updateData.bannerConfig.imageUrl = imageUrl;
          updateData.bannerConfig.imagePublicId = imagePublicId;
          updateData.bannerConfig.customImage = true;
        } else {
          updateData.bannerConfig = {
            imageUrl,
            imagePublicId,
            customImage: true,
            title: '',
            subtitle: '',
          };
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    // Parse and validate dates
    if (updateData.startDate) {
      const startDate = new Date(updateData.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format',
        });
      }
      updateData.startDate = startDate;
    }
    
    if (updateData.endDate) {
      const endDate = new Date(updateData.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format',
        });
      }
      updateData.endDate = endDate;
    }
    
    // Validate date range
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
        });
      }
    }

    // Parse and validate productIds
    if (updateData.productIds) {
      if (typeof updateData.productIds === 'string') {
        try {
          updateData.productIds = JSON.parse(updateData.productIds);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Invalid productIds format - must be valid JSON array',
          });
        }
      }
      
      // Ensure productIds is an array
      if (!Array.isArray(updateData.productIds)) {
        return res.status(400).json({
          success: false,
          message: 'productIds must be an array',
        });
      }
      
      // Validate all productIds are valid ObjectIds
      const invalidIds = updateData.productIds.filter(id => {
        if (!id) return true;
        const idStr = id.toString();
        return !mongoose.Types.ObjectId.isValid(idStr);
      });
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid product IDs found. Please remove invalid products and try again.`,
        });
      }
      
      // Convert to ObjectIds (service will handle this, but validate here too)
      updateData.productIds = updateData.productIds.map(id => {
        const idStr = id.toString();
        return new mongoose.Types.ObjectId(idStr);
      });
    }

    // Parse pageConfig if string
    if (updateData.pageConfig && typeof updateData.pageConfig === 'string') {
      try {
        updateData.pageConfig = JSON.parse(updateData.pageConfig);
      } catch (e) {
        // Keep as is if not JSON
      }
    }

    // Parse bannerConfig if string
    if (updateData.bannerConfig && typeof updateData.bannerConfig === 'string') {
      try {
        updateData.bannerConfig = JSON.parse(updateData.bannerConfig);
      } catch (e) {
        // Keep as is if not JSON
      }
    }

    const campaign = await updateCampaign(id, updateData);

    // Clear campaign cache
    await clearCampaignCache(id);

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete campaign (offer)
 * DELETE /api/admin/offers/:id
 */
export const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get campaign to check for image before deletion
    const campaign = await getCampaignById(id);

    // Delete campaign (service handles validation)
    await deleteCampaign(id);

    // Delete image from Cloudinary if it exists
    if (campaign.bannerConfig?.imagePublicId) {
      await deleteFromCloudinary(campaign.bannerConfig.imagePublicId);
    }

    // Clear campaign cache
    await clearCampaignCache(id);

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle campaign status
 * PATCH /api/admin/offers/:id/status
 */
export const updateOfferStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await toggleCampaignStatus(id);

    // Clear campaign cache
    await clearCampaignCache(id);

    res.status(200).json({
      success: true,
      message: `Offer status updated to ${campaign.status}`,
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};


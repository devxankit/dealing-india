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
    const updateData = { ...req.body };

    // Get existing campaign to check for old image
    const existingCampaign = await getCampaignById(id);

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

    // Parse dates
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Parse productIds if string array
    if (updateData.productIds && typeof updateData.productIds === 'string') {
      try {
        updateData.productIds = JSON.parse(updateData.productIds);
      } catch (e) {
        // Keep as is if not JSON
      }
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

    res.status(200).json({
      success: true,
      message: `Offer status updated to ${campaign.status}`,
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};


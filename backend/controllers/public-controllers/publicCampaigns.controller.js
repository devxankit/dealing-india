import {
  getPublicCampaigns,
  getPublicCampaignById,
} from '../../services/publicCampaigns.service.js';

/**
 * Get all active campaigns for public
 * GET /api/campaigns
 */
export const getCampaigns = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 100 } = req.query;

    const result = await getPublicCampaigns({
      type,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Campaigns retrieved successfully',
      data: {
        campaigns: result.campaigns,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get campaign by ID or slug for public
 * GET /api/campaigns/:id
 */
export const getCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await getPublicCampaignById(id);

    res.status(200).json({
      success: true,
      message: 'Campaign retrieved successfully',
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};


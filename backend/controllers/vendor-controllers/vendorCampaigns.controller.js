import {
  getVendorCampaigns,
  getVendorCampaignById,
} from '../../services/vendorCampaigns.service.js';

/**
 * Get all available campaigns for vendor
 * GET /api/vendor/campaigns
 */
export const getCampaigns = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const {
      search = '',
      status,
      type,
      page = 1,
      limit = 100,
    } = req.query;

    const result = await getVendorCampaigns(vendorId, {
      search,
      status,
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
 * Get campaign by ID for vendor
 * GET /api/vendor/campaigns/:id
 */
export const getCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    const campaign = await getVendorCampaignById(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Campaign retrieved successfully',
      data: { campaign },
    });
  } catch (error) {
    next(error);
  }
};



















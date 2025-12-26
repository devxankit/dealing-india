import {
  getVendorReels,
  getVendorReelById,
  createVendorReel,
  updateVendorReel,
  deleteVendorReel,
  updateVendorReelStatus,
} from '../../services/vendorReels.service.js';

/**
 * Get all reels for vendor
 * GET /api/vendor/reels
 */
export const getReels = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getVendorReels(vendorId, {
      search,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Reels retrieved successfully',
      data: {
        reels: result.reels,
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
 * Get reel by ID
 * GET /api/vendor/reels/:id
 */
export const getReel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    const reel = await getVendorReelById(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Reel retrieved successfully',
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new reel
 * POST /api/vendor/reels
 */
export const create = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const reelData = req.body;

    const reel = await createVendorReel(reelData, vendorId);

    res.status(201).json({
      success: true,
      message: 'Reel created successfully',
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update reel
 * PUT /api/vendor/reels/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;
    const reelData = req.body;

    const reel = await updateVendorReel(id, reelData, vendorId);

    res.status(200).json({
      success: true,
      message: 'Reel updated successfully',
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete reel
 * DELETE /api/vendor/reels/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    await deleteVendorReel(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Reel deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update reel status
 * PATCH /api/vendor/reels/:id/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;
    const { status } = req.body;

    if (!status) {
      const err = new Error('Status is required');
      err.status = 400;
      throw err;
    }

    const reel = await updateVendorReelStatus(id, status, vendorId);

    res.status(200).json({
      success: true,
      message: 'Reel status updated successfully',
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};


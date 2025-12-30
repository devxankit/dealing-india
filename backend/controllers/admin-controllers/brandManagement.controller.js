import {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  bulkDeleteBrands,
  toggleBrandStatus,
} from '../../services/brandManagement.service.js';

/**
 * Get all brands with filters
 * GET /api/admin/brands
 */
export const getBrands = async (req, res, next) => {
  try {
    const {
      search = '',
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getAllBrands({
      search,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get brand by ID
 * GET /api/admin/brands/:id
 */
export const getBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await getBrandById(id);

    res.status(200).json({
      success: true,
      message: 'Brand retrieved successfully',
      data: { brand },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new brand
 * POST /api/admin/brands
 */
export const create = async (req, res, next) => {
  try {
    const brandData = req.body;
    const brand = await createBrand(brandData);

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: { brand },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update brand
 * PUT /api/admin/brands/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const brand = await updateBrand(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      data: { brand },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete brand
 * DELETE /api/admin/brands/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteBrand(id);

    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete brands
 * DELETE /api/admin/brands/bulk
 */
export const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Brand IDs array is required',
      });
    }

    const result = await bulkDeleteBrands(ids);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} brand(s) deleted successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle brand status
 * PUT /api/admin/brands/:id/toggle-status
 */
export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await toggleBrandStatus(id);

    res.status(200).json({
      success: true,
      message: `Brand ${brand.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { brand },
    });
  } catch (error) {
    next(error);
  }
};


import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
  bulkUpdateCategoryOrder,
} from '../../services/categoryManagement.service.js';
import {
  uploadBase64ToCloudinary,
  deleteFromCloudinary,
  isBase64DataUrl,
} from '../../utils/cloudinary.util.js';

/**
 * Get all categories with filters
 * GET /api/admin/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const {
      search = '',
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'order',
      sortOrder = 'asc',
    } = req.query;

    const result = await getAllCategories({
      search,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID
 * GET /api/admin/categories/:id
 */
export const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await getCategoryById(id);

    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category
 * POST /api/admin/categories
 */
export const create = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };

    // Handle image upload to Cloudinary if base64 is provided
    if (categoryData.image && isBase64DataUrl(categoryData.image)) {
      try {
        const uploadResult = await uploadBase64ToCloudinary(
          categoryData.image,
          'categories'
        );
        categoryData.image = uploadResult.secure_url;
        categoryData.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    const category = await createCategory(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * PUT /api/admin/categories/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get existing category to check for old image
    const existingCategory = await getCategoryById(id);

    // Handle image upload to Cloudinary if new base64 image is provided
    if (updateData.image !== undefined) {
      if (updateData.image && isBase64DataUrl(updateData.image)) {
        try {
          // Upload new image to Cloudinary
          const uploadResult = await uploadBase64ToCloudinary(
            updateData.image,
            'categories'
          );
          updateData.image = uploadResult.secure_url;
          updateData.imagePublicId = uploadResult.public_id;

          // Delete old image from Cloudinary if it exists
          if (existingCategory.imagePublicId) {
            await deleteFromCloudinary(existingCategory.imagePublicId);
          }
        } catch (uploadError) {
          return res.status(400).json({
            success: false,
            message: `Image upload failed: ${uploadError.message}`,
          });
        }
      } else if (!updateData.image) {
        // Image is being removed
        if (existingCategory.imagePublicId) {
          await deleteFromCloudinary(existingCategory.imagePublicId);
        }
        updateData.imagePublicId = null;
      } else if (updateData.image && (updateData.image.startsWith('http://') || updateData.image.startsWith('https://'))) {
        // Already a URL (Cloudinary or other), extract public_id if Cloudinary
        const { extractPublicIdFromUrl } = await import('../../utils/cloudinary.util.js');
        const publicId = extractPublicIdFromUrl(updateData.image);
        if (publicId) {
          updateData.imagePublicId = publicId;
        }
      }
    }

    const category = await updateCategory(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * DELETE /api/admin/categories/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get category to check for image before deletion
    const category = await getCategoryById(id);

    // Delete category (service handles validation)
    await deleteCategory(id);

    // Delete image from Cloudinary if it exists
    if (category.imagePublicId) {
      await deleteFromCloudinary(category.imagePublicId);
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete categories
 * DELETE /api/admin/categories/bulk
 */
export const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category IDs array is required',
      });
    }

    const result = await bulkDeleteCategories(ids);

    // Delete images from Cloudinary
    if (result.imagePublicIds && result.imagePublicIds.length > 0) {
      const { deleteMultipleFromCloudinary } = await import('../../utils/cloudinary.util.js');
      await deleteMultipleFromCloudinary(result.imagePublicIds);
    }

    if (result.failedIds && result.failedIds.length > 0) {
      return res.status(200).json({
        success: true,
        message: `${result.deletedCount} category(ies) deleted successfully. ${result.failedIds.length} category(ies) could not be deleted (have subcategories).`,
        data: result,
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} category(ies) deleted successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update category order
 * PUT /api/admin/categories/bulk-order
 */
export const bulkUpdateOrder = async (req, res, next) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Orders array is required',
      });
    }

    // Validate each order object
    for (const orderItem of orders) {
      if (!orderItem.id || orderItem.order === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Each order item must have id and order fields',
        });
      }
    }

    const result = await bulkUpdateCategoryOrder(orders);

    res.status(200).json({
      success: true,
      message: `Order updated for ${result.updatedCount} category(ies) successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


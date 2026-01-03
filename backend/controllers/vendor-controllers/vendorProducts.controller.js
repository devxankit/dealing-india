import {
  getVendorProducts,
  getVendorProductById,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  updateVendorProductStatus,
} from '../../services/vendorProducts.service.js';

/**
 * Get all products for vendor
 * GET /api/vendor/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const {
      search = '',
      stock,
      categoryId,
      brandId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getVendorProducts(vendorId, {
      search,
      stock,
      categoryId,
      brandId,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: result.products,
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
 * Get product by ID
 * GET /api/vendor/products/:id
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    const product = await getVendorProductById(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 * POST /api/vendor/products
 */
export const create = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const productData = req.body;

    const product = await createVendorProduct(productData, vendorId);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 * PUT /api/vendor/products/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;
    const productData = req.body;

    const product = await updateVendorProduct(id, productData, vendorId);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (hard delete - permanently remove from database)
 * DELETE /api/vendor/products/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    // Delete product and get image public IDs
    const result = await deleteVendorProduct(id, vendorId);

    // Delete images from Cloudinary if they exist
    if (result.imagePublicIds && result.imagePublicIds.length > 0) {
      try {
        const { deleteMultipleFromCloudinary } = await import('../../utils/cloudinary.util.js');
        await deleteMultipleFromCloudinary(result.imagePublicIds);
      } catch (cloudinaryError) {
        // Log error but don't fail the request - product is already deleted
        console.error('Failed to delete images from Cloudinary:', cloudinaryError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully from database',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product status
 * PATCH /api/vendor/products/:id/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;
    const statusData = req.body;

    const product = await updateVendorProductStatus(id, statusData, vendorId);

    res.status(200).json({
      success: true,
      message: 'Product status updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};



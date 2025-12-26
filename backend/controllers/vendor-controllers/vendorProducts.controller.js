import {
  getVendorProducts,
  getVendorProductById,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  updateVendorProductStatus,
  bulkUploadVendorProducts,
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
 * Delete product (soft delete)
 * DELETE /api/vendor/products/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    await deleteVendorProduct(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
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

/**
 * Bulk upload products
 * POST /api/vendor/products/bulk-upload
 */
export const bulkUpload = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      const err = new Error('Products array is required');
      err.status = 400;
      throw err;
    }

    const result = await bulkUploadVendorProducts(products, vendorId);

    res.status(200).json({
      success: true,
      message: `Bulk upload completed: ${result.success} succeeded, ${result.failed} failed`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


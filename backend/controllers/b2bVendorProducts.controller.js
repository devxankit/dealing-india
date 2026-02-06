import {
  getB2BVendorProducts,
  getB2BVendorProductById,
  createB2BVendorProduct,
  updateB2BVendorProduct,
  deleteB2BVendorProduct,
} from '../services/b2bVendorProducts.service.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Get all B2B vendor products
 * GET /api/b2b-vendor/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    // Verify vendor is B2B type
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.vendorType !== 'b2b') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for B2B vendors.',
      });
    }

    const {
      search = '',
      category = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getB2BVendorProducts(vendorId, {
      search,
      category,
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
 * Get B2B product by ID
 * GET /api/b2b-vendor/products/:id
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    // Verify vendor is B2B type
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.vendorType !== 'b2b') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for B2B vendors.',
      });
    }

    const product = await getB2BVendorProductById(id, vendorId);

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
 * Create new B2B product
 * POST /api/b2b-vendor/products
 */
export const create = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    // Verify vendor is B2B type
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.vendorType !== 'b2b') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for B2B vendors.',
      });
    }

    const productData = req.body;

    const product = await createB2BVendorProduct(productData, vendorId);

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
 * Update B2B product
 * PUT /api/b2b-vendor/products/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    // Verify vendor is B2B type
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.vendorType !== 'b2b') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for B2B vendors.',
      });
    }

    const productData = req.body;

    const product = await updateB2BVendorProduct(id, productData, vendorId);

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
 * Delete B2B product
 * DELETE /api/b2b-vendor/products/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    // Verify vendor is B2B type
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.vendorType !== 'b2b') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for B2B vendors.',
      });
    }

    // Delete product and get image public IDs
    const result = await deleteB2BVendorProduct(id, vendorId);

    // Delete images from Cloudinary if they exist
    if (result.imagePublicIds && result.imagePublicIds.length > 0) {
      try {
        const { deleteMultipleFromCloudinary } = await import('../utils/cloudinary.util.js');
        await deleteMultipleFromCloudinary(result.imagePublicIds);
      } catch (cloudinaryError) {
        // Log error but don't fail the request - product is already deleted
        console.error('Failed to delete images from Cloudinary:', cloudinaryError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

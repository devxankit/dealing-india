import { getPublicProducts, getPublicProductById, getB2BSearchSuggestions } from '../services/publicProduct.service.js';

/**
 * Get all public products with filters
 * GET /api/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      search = '',
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      vendorId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      vendorType = 'b2b',
      state,
      city,
      itemType,
      area,
      market,
      businessType,
      businessSubType,
      dynamicFilters
    } = req.query;

    const result = await getPublicProducts({
      search,
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      vendorId,
      page,
      limit,
      sortBy,
      sortOrder,
      vendorType,
      state,
      city,
      itemType,
      area,
      market,
      businessType,
      businessSubType,
      dynamicFilters
    });

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public product by ID
 * GET /api/products/:id
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await getPublicProductById(id);

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
 * Get B2B search suggestions
 * GET /api/products/b2b-suggestions
 */
export const getB2BSuggestions = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const suggestions = await getB2BSearchSuggestions(q);
    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};


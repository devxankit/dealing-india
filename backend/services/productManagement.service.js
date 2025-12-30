import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';

/**
 * Get all products with optional filters
 * @param {Object} filters - { search, stock, categoryId, brandId, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getAllProducts = async (filters = {}) => {
  try {
    const {
      search = '',
      stock,
      categoryId,
      brandId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = {};
    const andConditions = [];

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Stock status filter
    if (stock && stock !== 'all') {
      query.stock = stock;
    }

    // Category filter - check both categoryId and subcategoryId
    if (categoryId && categoryId !== 'all') {
      andConditions.push({
        $or: [
          { categoryId: categoryId },
          { subcategoryId: categoryId },
        ],
      });
    }

    // Brand filter
    if (brandId && brandId !== 'all') {
      query.brandId = brandId;
    }

    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name')
        .populate('subcategoryId', 'name')
        .populate('brandId', 'name')
        .populate('vendorId', 'businessName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get product by ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getProductById = async (productId) => {
  try {
    const product = await Product.findById(productId)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('brandId', 'name')
      .populate('vendorId', 'businessName')
      .lean();
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid product ID');
    }
    throw error;
  }
};

/**
 * Create a new product
 * @param {Object} productData - Product data from frontend
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    const {
      name,
      unit,
      price,
      originalPrice,
      image,
      images,
      description,
      categoryId,
      subcategoryId,
      brandId,
      stock,
      stockQuantity,
      totalAllowedQuantity,
      minimumOrderQuantity,
      warrantyPeriod,
      guaranteePeriod,
      hsnCode,
      flashSale,
      isNew,
      isFeatured,
      isVisible,
      codAllowed,
      returnable,
      cancelable,
      taxIncluded,
      variants,
      tags,
      seoTitle,
      seoDescription,
      relatedProducts,
      vendorId,
    } = productData;

    // Validate required fields
    if (!name || !name.trim()) {
      throw new Error('Product name is required');
    }
    if (price === undefined || price === null || price < 0) {
      throw new Error('Price is required and must be >= 0');
    }
    if (stockQuantity === undefined || stockQuantity === null || stockQuantity < 0) {
      throw new Error('Stock quantity is required and must be >= 0');
    }

    // Determine final categoryId - use subcategoryId if present, else categoryId
    const finalCategoryId = subcategoryId || categoryId || null;

    // Validate category if provided
    if (finalCategoryId) {
      const category = await Category.findById(finalCategoryId);
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Validate brand if provided
    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
    }

    // Validate vendor if provided
    if (vendorId) {
      const Vendor = (await import('../models/Vendor.model.js')).default;
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      unit: unit || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      image: image || null,
      imagePublicId: productData.imagePublicId || null,
      images: images || [],
      imagesPublicIds: productData.imagesPublicIds || [],
      description: description || '',
      categoryId: finalCategoryId,
      subcategoryId: subcategoryId || null,
      brandId: brandId || null,
      stock: stock || 'in_stock',
      stockQuantity: parseInt(stockQuantity),
      totalAllowedQuantity: totalAllowedQuantity ? parseInt(totalAllowedQuantity) : null,
      minimumOrderQuantity: minimumOrderQuantity ? parseInt(minimumOrderQuantity) : null,
      warrantyPeriod: warrantyPeriod || null,
      guaranteePeriod: guaranteePeriod || null,
      hsnCode: hsnCode || null,
      flashSale: flashSale || false,
      isNew: isNew || false,
      isFeatured: isFeatured || false,
      isVisible: isVisible !== undefined ? isVisible : true,
      codAllowed: codAllowed !== undefined ? codAllowed : true,
      returnable: returnable !== undefined ? returnable : true,
      cancelable: cancelable !== undefined ? cancelable : true,
      taxIncluded: taxIncluded || false,
      variants: variants || {
        sizes: [],
        colors: [],
        materials: [],
        prices: {},
        defaultVariant: {},
      },
      tags: tags || [],
      seoTitle: seoTitle || '',
      seoDescription: seoDescription || '',
      relatedProducts: relatedProducts || [],
      vendorId: vendorId || null,
      rating: 0,
      reviewCount: 0,
      isActive: true,
    });

    return product.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Product with this name already exists');
    }
    throw error;
  }
};

/**
 * Update product
 * @param {String} productId - Product ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (productId, updateData) => {
  try {
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const {
      name,
      unit,
      price,
      originalPrice,
      image,
      imagePublicId,
      images,
      imagesPublicIds,
      description,
      categoryId,
      subcategoryId,
      brandId,
      stock,
      stockQuantity,
      totalAllowedQuantity,
      minimumOrderQuantity,
      warrantyPeriod,
      guaranteePeriod,
      hsnCode,
      flashSale,
      isNew,
      isFeatured,
      isVisible,
      codAllowed,
      returnable,
      cancelable,
      taxIncluded,
      variants,
      tags,
      seoTitle,
      seoDescription,
      relatedProducts,
    } = updateData;

    // Build update object
    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (unit !== undefined) updateObj.unit = unit || '';
    if (price !== undefined) updateObj.price = parseFloat(price);
    if (originalPrice !== undefined) updateObj.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (image !== undefined) updateObj.image = image || null;
    if (imagePublicId !== undefined) updateObj.imagePublicId = imagePublicId || null;
    if (images !== undefined) updateObj.images = images || [];
    if (imagesPublicIds !== undefined) updateObj.imagesPublicIds = imagesPublicIds || [];
    if (description !== undefined) updateObj.description = description || '';
    if (stock !== undefined) updateObj.stock = stock;
    if (stockQuantity !== undefined) updateObj.stockQuantity = parseInt(stockQuantity);
    if (totalAllowedQuantity !== undefined) updateObj.totalAllowedQuantity = totalAllowedQuantity ? parseInt(totalAllowedQuantity) : null;
    if (minimumOrderQuantity !== undefined) updateObj.minimumOrderQuantity = minimumOrderQuantity ? parseInt(minimumOrderQuantity) : null;
    if (warrantyPeriod !== undefined) updateObj.warrantyPeriod = warrantyPeriod || null;
    if (guaranteePeriod !== undefined) updateObj.guaranteePeriod = guaranteePeriod || null;
    if (hsnCode !== undefined) updateObj.hsnCode = hsnCode || null;
    if (flashSale !== undefined) updateObj.flashSale = flashSale;
    if (isNew !== undefined) updateObj.isNew = isNew;
    if (isFeatured !== undefined) updateObj.isFeatured = isFeatured;
    if (isVisible !== undefined) updateObj.isVisible = isVisible;
    if (codAllowed !== undefined) updateObj.codAllowed = codAllowed;
    if (returnable !== undefined) updateObj.returnable = returnable;
    if (cancelable !== undefined) updateObj.cancelable = cancelable;
    if (taxIncluded !== undefined) updateObj.taxIncluded = taxIncluded;
    if (variants !== undefined) updateObj.variants = variants;
    if (tags !== undefined) updateObj.tags = tags || [];
    if (seoTitle !== undefined) updateObj.seoTitle = seoTitle || '';
    if (seoDescription !== undefined) updateObj.seoDescription = seoDescription || '';
    if (relatedProducts !== undefined) updateObj.relatedProducts = relatedProducts || [];

    // Handle category logic - use subcategoryId if present, else categoryId
    if (subcategoryId !== undefined || categoryId !== undefined) {
      const finalCategoryId = subcategoryId || categoryId || null;
      updateObj.categoryId = finalCategoryId;
      updateObj.subcategoryId = subcategoryId || null;

      // Validate category if provided
      if (finalCategoryId) {
        const category = await Category.findById(finalCategoryId);
        if (!category) {
          throw new Error('Category not found');
        }
      }
    }

    // Validate brand if being updated
    if (brandId !== undefined) {
      if (brandId) {
        const brand = await Brand.findById(brandId);
        if (!brand) {
          throw new Error('Brand not found');
        }
        updateObj.brandId = brandId;
      } else {
        updateObj.brandId = null;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateObj,
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('brandId', 'name')
      .populate('vendorId', 'businessName')
      .lean();

    if (!updatedProduct) {
      throw new Error('Product not found');
    }

    return updatedProduct;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid product ID');
    }
    throw error;
  }
};

/**
 * Delete product
 * @param {String} productId - Product ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteProduct = async (productId) => {
  try {
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid product ID');
    }
    throw error;
  }
};


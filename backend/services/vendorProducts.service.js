import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import Attribute from '../models/Attribute.model.js';
import AttributeValue from '../models/AttributeValue.model.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';

/**
 * Get all products for a vendor with optional filters
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, stock, categoryId, brandId, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getVendorProducts = async (vendorId, filters = {}) => {
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

    // Build query - always filter by vendorId
    const query = { vendorId, isActive: true };
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

    // Category filter
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
        .populate('attributes.attributeId', 'name type')
        .populate('attributes.values', 'value')
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
 * Get product by ID (vendor-owned only)
 * @param {String} productId - Product ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Product object
 */
export const getVendorProductById = async (productId, vendorId) => {
  try {
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    })
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('brandId', 'name')
      .populate('attributes.attributeId', 'name type')
      .populate('attributes.values', 'value')
      .lean();

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    return product;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new product for vendor
 * @param {Object} productData - Product data
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Created product
 */
export const createVendorProduct = async (productData, vendorId) => {
  try {
    const {
      name,
      unit,
      price,
      originalPrice,
      image,
      images = [],
      categoryId,
      subcategoryId,
      brandId,
      stock,
      stockQuantity,
      description,
      tags = [],
      attributes = [],
      variants = {},
      seoTitle,
      seoDescription,
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
      totalAllowedQuantity,
      minimumOrderQuantity,
    } = productData;

    // Validate required fields
    if (!name || !price || stockQuantity === undefined) {
      const err = new Error('Name, price, and stock quantity are required');
      err.status = 400;
      throw err;
    }

    // Validate category exists
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        const err = new Error('Category not found');
        err.status = 404;
        throw err;
      }
    }

    // Validate subcategory if provided
    if (subcategoryId) {
      const subcategory = await Category.findById(subcategoryId);
      if (!subcategory) {
        const err = new Error('Subcategory not found');
        err.status = 404;
        throw err;
      }
    }

    // Validate brand if provided
    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand || !brand.isActive) {
        const err = new Error('Brand not found or inactive');
        err.status = 404;
        throw err;
      }
    }

    // Validate and process attributes
    const processedAttributes = [];
    if (attributes && attributes.length > 0) {
      for (const attr of attributes) {
        if (!attr.attributeId) continue;

        // Verify attribute exists and is active
        const attribute = await Attribute.findById(attr.attributeId);
        if (!attribute || attribute.status !== 'active') {
          const err = new Error(`Attribute ${attr.attributeId} not found or inactive`);
          err.status = 400;
          throw err;
        }

        // Validate attribute values
        if (attr.values && attr.values.length > 0) {
          const validValues = await AttributeValue.find({
            _id: { $in: attr.values },
            attributeId: attr.attributeId,
            status: 'active',
          });

          if (validValues.length !== attr.values.length) {
            const err = new Error('Some attribute values are invalid or inactive');
            err.status = 400;
            throw err;
          }
        }

        processedAttributes.push({
          attributeId: attribute._id, // Use the validated attribute's _id
          attributeName: attr.attributeName || attribute.name,
          values: (attr.values || []).map(val => {
            // Find the matching value object to get its _id
            const valueObj = validValues.find(v => 
              v._id.toString() === val.toString() || v._id.toString() === val
            );
            return valueObj ? valueObj._id : val;
          }),
        });
      }
    }

    // Determine final categoryId (subcategory takes precedence)
    const finalCategoryIdToUse = validatedSubcategoryId || validatedCategoryId || null;

    // Upload main image if provided (base64)
    let imageUrl = null;
    let imagePublicId = null;
    if (image) {
      if (image.startsWith('data:') || image.startsWith('http')) {
        const uploadResult = await uploadBase64ToCloudinary(image, 'products');
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      } else {
        imageUrl = image;
      }
    }

    // Upload gallery images if provided
    const imageUrls = [];
    const imagePublicIds = [];
    if (images && images.length > 0) {
      for (const img of images) {
        if (img.startsWith('data:') || img.startsWith('http')) {
          const uploadResult = await uploadBase64ToCloudinary(img, 'products');
          imageUrls.push(uploadResult.secure_url);
          imagePublicIds.push(uploadResult.public_id);
        } else {
          imageUrls.push(img);
        }
      }
    }

    // Calculate stock status
    const stockStatus = stockQuantity === 0 
      ? 'out_of_stock' 
      : stockQuantity <= 10 
        ? 'low_stock' 
        : 'in_stock';

    // Get vendor name
    const Vendor = (await import('../models/Vendor.model.js')).default;
    const vendor = await Vendor.findById(vendorId);
    const vendorName = vendor?.businessName || vendor?.storeName || '';

    // Create product
    const product = await Product.create({
      name: name.trim(),
      unit: unit || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      image: imageUrl,
      imagePublicId: imagePublicId,
      images: imageUrls,
      imagesPublicIds: imagePublicIds,
      description: description || '',
      categoryId: finalCategoryIdToUse,
      subcategoryId: validatedSubcategoryId || null,
      brandId: validatedBrandId || null,
      stock: stock || stockStatus,
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
      attributes: processedAttributes,
      seoTitle: seoTitle || '',
      seoDescription: seoDescription || '',
      vendorId,
      vendorName,
      rating: 0,
      reviewCount: 0,
      isActive: true,
    });

    return product.toObject();
  } catch (error) {
    throw error;
  }
};

/**
 * Update product (vendor-owned only)
 * @param {String} productId - Product ID
 * @param {Object} productData - Update data
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated product
 */
export const updateVendorProduct = async (productId, productData, vendorId) => {
  try {
    // Verify product exists and belongs to vendor
    const existingProduct = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    });

    if (!existingProduct) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const {
      name,
      unit,
      price,
      originalPrice,
      image,
      images,
      categoryId,
      subcategoryId,
      brandId,
      stock,
      stockQuantity,
      description,
      tags,
      attributes,
      variants,
      seoTitle,
      seoDescription,
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
      totalAllowedQuantity,
      minimumOrderQuantity,
    } = productData;

    // Validate category if provided
    let validatedCategoryId = null;
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        const err = new Error('Category not found');
        err.status = 404;
        throw err;
      }
      validatedCategoryId = category._id;
    }

    // Validate subcategory if provided
    let validatedSubcategoryId = null;
    if (subcategoryId) {
      const subcategory = await Category.findById(subcategoryId);
      if (!subcategory) {
        const err = new Error('Subcategory not found');
        err.status = 404;
        throw err;
      }
      validatedSubcategoryId = subcategory._id;
    }

    // Validate brand if provided
    let validatedBrandId = null;
    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand || !brand.isActive) {
        const err = new Error('Brand not found or inactive');
        err.status = 404;
        throw err;
      }
      validatedBrandId = brand._id;
    }

    // Validate and process attributes if provided
    let processedAttributes = existingProduct.attributes;
    if (attributes !== undefined) {
      processedAttributes = [];
      if (attributes.length > 0) {
        for (const attr of attributes) {
          if (!attr.attributeId) continue;

          const attribute = await Attribute.findById(attr.attributeId);
          if (!attribute || attribute.status !== 'active') {
            const err = new Error(`Attribute ${attr.attributeId} not found or inactive`);
            err.status = 400;
            throw err;
          }

          if (attr.values && attr.values.length > 0) {
            const validValues = await AttributeValue.find({
              _id: { $in: attr.values },
              attributeId: attr.attributeId,
              status: 'active',
            });

            if (validValues.length !== attr.values.length) {
              const err = new Error('Some attribute values are invalid or inactive');
              err.status = 400;
              throw err;
            }
          }

          processedAttributes.push({
            attributeId: attribute._id, // Use the validated attribute's _id
            attributeName: attr.attributeName || attribute.name,
            values: (attr.values || []).map(val => {
              // Find the matching value object to get its _id
              const valueObj = validValues.find(v => 
                v._id.toString() === val.toString() || v._id.toString() === val
              );
              return valueObj ? valueObj._id : val;
            }),
          });
        }
      }
    }

    // Determine final categoryId (subcategory takes precedence)
    const finalCategoryIdToUse = validatedSubcategoryId !== null
      ? validatedSubcategoryId
      : validatedCategoryId !== null
        ? validatedCategoryId
        : (subcategoryId !== undefined || categoryId !== undefined 
          ? null 
          : existingProduct.categoryId);

    // Handle image upload if new image provided
    let imageUrl = existingProduct.image;
    let imagePublicId = existingProduct.imagePublicId;
    if (image !== undefined) {
      if (image && (image.startsWith('data:') || image.startsWith('http'))) {
        // Delete old image if exists
        if (existingProduct.imagePublicId) {
          await deleteFromCloudinary(existingProduct.imagePublicId);
        }
        // Upload new image
        const uploadResult = await uploadBase64ToCloudinary(image, 'products');
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      } else if (!image) {
        // Delete old image if image is cleared
        if (existingProduct.imagePublicId) {
          await deleteFromCloudinary(existingProduct.imagePublicId);
        }
        imageUrl = null;
        imagePublicId = null;
      }
    }

    // Handle gallery images if provided
    let imageUrls = existingProduct.images || [];
    let imagePublicIds = existingProduct.imagesPublicIds || [];
    if (images !== undefined) {
      // Delete old gallery images
      if (existingProduct.imagesPublicIds && existingProduct.imagesPublicIds.length > 0) {
        await Promise.all(
          existingProduct.imagesPublicIds.map(id => deleteFromCloudinary(id))
        );
      }
      // Upload new gallery images
      imageUrls = [];
      imagePublicIds = [];
      if (images.length > 0) {
        for (const img of images) {
          if (img.startsWith('data:') || img.startsWith('http')) {
            const uploadResult = await uploadBase64ToCloudinary(img, 'products');
            imageUrls.push(uploadResult.secure_url);
            imagePublicIds.push(uploadResult.public_id);
          } else {
            imageUrls.push(img);
          }
        }
      }
    }

    // Calculate stock status if stockQuantity changed
    const finalStockQuantity = stockQuantity !== undefined 
      ? parseInt(stockQuantity) 
      : existingProduct.stockQuantity;
    const stockStatus = finalStockQuantity === 0 
      ? 'out_of_stock' 
      : finalStockQuantity <= 10 
        ? 'low_stock' 
        : 'in_stock';

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(unit !== undefined && { unit: unit || '' }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseFloat(originalPrice) : null }),
        ...(image !== undefined && { image: imageUrl, imagePublicId: imagePublicId }),
        ...(images !== undefined && { images: imageUrls, imagesPublicIds: imagePublicIds }),
        ...(description !== undefined && { description: description || '' }),
        ...((categoryId !== undefined || subcategoryId !== undefined) && { categoryId: finalCategoryIdToUse }),
        ...(subcategoryId !== undefined && { subcategoryId: validatedSubcategoryId || null }),
        ...(categoryId !== undefined && subcategoryId === undefined && { subcategoryId: null }),
        ...(brandId !== undefined && { brandId: validatedBrandId || null }),
        ...(stockQuantity !== undefined && { stockQuantity: finalStockQuantity, stock: stock || stockStatus }),
        ...(stock !== undefined && stockQuantity === undefined && { stock }),
        ...(totalAllowedQuantity !== undefined && { totalAllowedQuantity: totalAllowedQuantity ? parseInt(totalAllowedQuantity) : null }),
        ...(minimumOrderQuantity !== undefined && { minimumOrderQuantity: minimumOrderQuantity ? parseInt(minimumOrderQuantity) : null }),
        ...(warrantyPeriod !== undefined && { warrantyPeriod: warrantyPeriod || null }),
        ...(guaranteePeriod !== undefined && { guaranteePeriod: guaranteePeriod || null }),
        ...(hsnCode !== undefined && { hsnCode: hsnCode || null }),
        ...(flashSale !== undefined && { flashSale }),
        ...(isNew !== undefined && { isNew }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isVisible !== undefined && { isVisible }),
        ...(codAllowed !== undefined && { codAllowed }),
        ...(returnable !== undefined && { returnable }),
        ...(cancelable !== undefined && { cancelable }),
        ...(taxIncluded !== undefined && { taxIncluded }),
        ...(variants !== undefined && { variants }),
        ...(tags !== undefined && { tags }),
        ...(attributes !== undefined && { attributes: processedAttributes }),
        ...(seoTitle !== undefined && { seoTitle: seoTitle || '' }),
        ...(seoDescription !== undefined && { seoDescription: seoDescription || '' }),
      },
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('brandId', 'name')
      .populate('attributes.attributeId', 'name type')
      .populate('attributes.values', 'value')
      .lean();

    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete product (soft delete - set isActive=false)
 * @param {String} productId - Product ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteVendorProduct = async (productId, vendorId) => {
  try {
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    });

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    // Soft delete
    await Product.findByIdAndUpdate(productId, { isActive: false });

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Update product status (isVisible, stock status)
 * @param {String} productId - Product ID
 * @param {Object} statusData - { isVisible?, stock? }
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated product
 */
export const updateVendorProductStatus = async (productId, statusData, vendorId) => {
  try {
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    });

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const updateData = {};
    if (statusData.isVisible !== undefined) {
      updateData.isVisible = statusData.isVisible;
    }
    if (statusData.stock !== undefined) {
      updateData.stock = statusData.stock;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    )
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('brandId', 'name')
      .lean();

    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk upload products from CSV
 * @param {Array} productsData - Array of product data
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} { success: number, failed: number, errors: Array }
 */
export const bulkUploadVendorProducts = async (productsData, vendorId) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Get vendor name
    const Vendor = (await import('../models/Vendor.model.js')).default;
    const vendor = await Vendor.findById(vendorId);
    const vendorName = vendor?.businessName || vendor?.storeName || '';

    for (let i = 0; i < productsData.length; i++) {
      try {
        const productData = productsData[i];

        // Validate required fields
        if (!productData.name || !productData.price || productData.stockQuantity === undefined) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields: name, price, or stockQuantity',
          });
          continue;
        }

        // Validate category if provided
        let validatedCategoryId = null;
        if (productData.categoryId) {
          const category = await Category.findById(productData.categoryId);
          if (!category) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: `Category ${productData.categoryId} not found`,
            });
            continue;
          }
          validatedCategoryId = category._id;
        }

        // Validate brand if provided
        let validatedBrandId = null;
        if (productData.brandId) {
          const brand = await Brand.findById(productData.brandId);
          if (!brand || !brand.isActive) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: `Brand ${productData.brandId} not found or inactive`,
            });
            continue;
          }
          validatedBrandId = brand._id;
        }

        // Calculate stock status
        const stockQuantity = parseInt(productData.stockQuantity);
        const stockStatus = stockQuantity === 0 
          ? 'out_of_stock' 
          : stockQuantity <= 10 
            ? 'low_stock' 
            : 'in_stock';

        // Create product
        await Product.create({
          name: productData.name.trim(),
          unit: productData.unit || '',
          price: parseFloat(productData.price),
          originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
          image: productData.image || null,
          images: productData.images || [],
          description: productData.description || '',
          categoryId: validatedCategoryId || null,
          subcategoryId: null, // Bulk upload doesn't support subcategories yet
          brandId: validatedBrandId || null,
          stock: productData.stock || stockStatus,
          stockQuantity: stockQuantity,
          tags: productData.tags || [],
          variants: productData.variants || {
            sizes: [],
            colors: [],
            materials: [],
            prices: {},
            defaultVariant: {},
          },
          vendorId,
          vendorName,
          rating: 0,
          reviewCount: 0,
          isActive: true,
          isVisible: productData.isVisible !== undefined ? productData.isVisible : true,
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};


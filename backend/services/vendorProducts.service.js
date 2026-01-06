import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import Attribute from '../models/Attribute.model.js';
import AttributeValue from '../models/AttributeValue.model.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import { sanitizeImageUrl, sanitizeImageUrls } from '../utils/imageValidation.util.js';

/**
 * Automated SKU Generation
 * Logic: [FIRST-3-OF-NAME]-[VENDOR-ID-LAST-4]-[TIMESTAMP-SHORT]
 */
const generateSKU = async (name, vendorId) => {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const vendorSuffix = vendorId.toString().slice(-4).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  let generatedSku = `${prefix}-${vendorSuffix}-${timestamp}`;

  // Ensure uniqueness
  let isUnique = false;
  let counter = 0;
  while (!isUnique) {
    const existing = await Product.findOne({ sku: generatedSku });
    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      generatedSku = `${prefix}-${vendorSuffix}-${timestamp}-${counter}`;
    }
  }
  return generatedSku;
};

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

    // Sanitize product images - remove broken/invalid image URLs
    const sanitizedProducts = products.map(product => ({
      ...product,
      image: sanitizeImageUrl(product.image),
      images: sanitizeImageUrls(product.images || []),
    }));

    return {
      products: sanitizedProducts,
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

    // Sanitize product images - remove broken/invalid image URLs
    product.image = sanitizeImageUrl(product.image);
    product.images = sanitizeImageUrls(product.images || []);

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
      sku,
      unit,
      price,
      originalPrice,
      image,
      images = [],
      categoryId,
      subcategoryId,
      subSubCategoryId, // This should be set when sub-subcategory is selected
      brandId: initialBrandId,
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
      isTrending,
      isFeatured,
      isVisible,
      codAllowed,
      returnable,
      cancelable,
      taxIncluded,
      totalAllowedQuantity,
      minimumOrderQuantity,
      hasSizes,
      productType,
      isCouponEligible,
      applicableCoupons,
    } = productData;

    // Validate required fields
    if (!name || !name.trim()) {
      const err = new Error('Product name is required');
      err.status = 400;
      throw err;
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      const err = new Error('Valid price is required (must be a positive number)');
      err.status = 400;
      throw err;
    }

    if (stockQuantity === undefined || stockQuantity === null || isNaN(parseInt(stockQuantity)) || parseInt(stockQuantity) < 0) {
      const err = new Error('Valid stock quantity is required (must be a non-negative number)');
      err.status = 400;
      throw err;
    }

    // Validate SKU uniqueness if provided
    if (sku && sku.trim()) {
      const existingProduct = await Product.findOne({
        sku: sku.trim().toUpperCase(),
        isActive: true,
        _id: { $ne: vendorId } // Exclude current product if updating
      });
      if (existingProduct) {
        const err = new Error('SKU already exists. Please use a unique SKU.');
        err.status = 400;
        throw err;
      }
    }

    // Validate category exists - handle object format
    if (categoryId) {
      let categoryIdToCheck = categoryId;
      if (typeof categoryId === 'object' && categoryId !== null) {
        categoryIdToCheck = categoryId._id || categoryId.id || categoryId;
      }
      const categoryIdStr = categoryIdToCheck?.toString() || String(categoryIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(categoryIdStr)) {
        const err = new Error('Invalid category ID format');
        err.status = 400;
        throw err;
      }
      const category = await Category.findById(categoryIdStr);
      if (!category) {
        const err = new Error('Category not found');
        err.status = 404;
        throw err;
      }
    }

    // Validate subcategory if provided - handle object format
    if (subcategoryId) {
      let subcategoryIdToCheck = subcategoryId;
      if (typeof subcategoryId === 'object' && subcategoryId !== null) {
        subcategoryIdToCheck = subcategoryId._id || subcategoryId.id || subcategoryId;
      }
      const subcategoryIdStr = subcategoryIdToCheck?.toString() || String(subcategoryIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(subcategoryIdStr)) {
        const err = new Error('Invalid subcategory ID format');
        err.status = 400;
        throw err;
      }
      const subcategory = await Category.findById(subcategoryIdStr);
      if (!subcategory) {
        const err = new Error('Subcategory not found');
        err.status = 404;
        throw err;
      }
    }

    // Validate sub-subcategory if provided - handle object format
    if (subSubCategoryId) {
      let subSubCategoryIdToCheck = subSubCategoryId;
      if (typeof subSubCategoryId === 'object' && subSubCategoryId !== null) {
        subSubCategoryIdToCheck = subSubCategoryId._id || subSubCategoryId.id || subSubCategoryId;
      }
      const subSubCategoryIdStr = subSubCategoryIdToCheck?.toString() || String(subSubCategoryIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(subSubCategoryIdStr)) {
        const err = new Error('Invalid sub-subcategory ID format');
        err.status = 400;
        throw err;
      }
      const subSubCategory = await Category.findById(subSubCategoryIdStr);
      if (!subSubCategory) {
        const err = new Error('Sub-subcategory not found');
        err.status = 404;
        throw err;
      }
    }

    // Handle Brand: Manual Name or ID
    let brandId = initialBrandId;

    if (productData.brandName && productData.brandName.trim()) {
      const BrandModel = mongoose.model('Brand');
      const nameRegex = new RegExp(`^${productData.brandName.trim()}$`, 'i');
      let brand = await BrandModel.findOne({ name: nameRegex });

      if (!brand) {
        // Create new brand
        console.log(`Creating new brand: ${productData.brandName}`);
        brand = await BrandModel.create({
          name: productData.brandName.trim(),
          isActive: true, // Automatically active
          isFeatured: false
        });
      }
      brandId = brand._id;
    }
    // Validate brand if provided as ID
    else if (brandId) {
      let brandIdToCheck = brandId;
      if (typeof brandId === 'object' && brandId !== null) {
        brandIdToCheck = brandId._id || brandId.id || brandId;
      }
      const brandIdStr = brandIdToCheck?.toString() || String(brandIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(brandIdStr)) {
        const err = new Error('Invalid brand ID format');
        err.status = 400;
        throw err;
      }
      const brand = await Brand.findById(brandIdStr);
      if (!brand || !brand.isActive) {
        const err = new Error('Brand not found or inactive');
        err.status = 404;
        throw err;
      }
      brandId = brand._id;
    }

    // Validate and process attributes
    const processedAttributes = [];
    if (attributes && attributes.length > 0) {
      for (const attr of attributes) {
        // Option 1: Predefined attribute (with attributeId)
        if (attr.attributeId) {
          // Verify attribute exists and is active
          const attribute = await Attribute.findById(attr.attributeId);
          if (!attribute || attribute.status !== 'active') {
            const err = new Error(`Attribute ${attr.attributeId} not found or inactive`);
            err.status = 400;
            throw err;
          }

          // Validate attribute values
          let validValues = [];
          if (attr.values && attr.values.length > 0) {
            validValues = await AttributeValue.find({
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
            attributeId: attribute._id,
            attributeName: attr.attributeName || attribute.name,
            values: (attr.values || []).map(val => {
              const valueObj = validValues?.find(v =>
                v._id.toString() === val.toString() || v._id.toString() === val
              );
              return valueObj ? valueObj._id : val;
            }),
          });
        }
        // Option 2: Custom attribute (with name and value)
        else if (attr.name && attr.value) {
          processedAttributes.push({
            name: attr.name,
            value: attr.value,
            group: attr.group || '',
            isRequired: attr.isRequired || false
          });
        }
      }
    }

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

    // Process color variants if provided
    let processedColorVariants = [];
    if (variants && variants.colorVariants && Array.isArray(variants.colorVariants)) {
      for (const colorVariant of variants.colorVariants) {
        if (!colorVariant.colorName) {
          continue; // Skip invalid color variants
        }

        // Upload thumbnail image if provided
        let thumbnailImageUrl = null;
        let thumbnailImagePublicId = null;
        if (colorVariant.thumbnailImage) {
          if (colorVariant.thumbnailImage.startsWith('data:') || colorVariant.thumbnailImage.startsWith('http')) {
            const uploadResult = await uploadBase64ToCloudinary(colorVariant.thumbnailImage, 'products/variants');
            thumbnailImageUrl = uploadResult.secure_url;
            thumbnailImagePublicId = uploadResult.public_id;
          } else {
            thumbnailImageUrl = colorVariant.thumbnailImage;
          }
        }

        // Process size variants for this color
        const processedSizeVariants = [];
        if (colorVariant.sizeVariants && Array.isArray(colorVariant.sizeVariants)) {
          for (const sizeVariant of colorVariant.sizeVariants) {
            if (!sizeVariant.size || sizeVariant.stockQuantity === undefined) {
              continue; // Skip invalid size variants
            }

            // Calculate stock status for size variant
            const sizeStockStatus = sizeVariant.stockQuantity === 0
              ? 'out_of_stock'
              : sizeVariant.stockQuantity <= 10
                ? 'low_stock'
                : 'in_stock';

            processedSizeVariants.push({
              size: sizeVariant.size.trim(),
              price: sizeVariant.price !== undefined && sizeVariant.price !== null
                ? parseFloat(sizeVariant.price)
                : null,
              originalPrice: sizeVariant.originalPrice !== undefined && sizeVariant.originalPrice !== null
                ? parseFloat(sizeVariant.originalPrice)
                : null,
              stockQuantity: parseInt(sizeVariant.stockQuantity),
              stockStatus: sizeVariant.stockStatus || sizeStockStatus,
            });
          }
        }

        processedColorVariants.push({
          colorName: colorVariant.colorName.trim(),
          colorCode: colorVariant.colorCode ? colorVariant.colorCode.trim() : null,
          thumbnailImage: thumbnailImageUrl,
          thumbnailImagePublicId: thumbnailImagePublicId,
          sizeVariants: processedSizeVariants,
        });
      }
    }

    // Validate variation consistency
    if (processedColorVariants.length > 0) {
      // Ensure at least one color variant has at least one size variant
      const hasValidVariants = processedColorVariants.some(cv => cv.sizeVariants.length > 0);
      if (!hasValidVariants) {
        const err = new Error('At least one color variant must have size variants');
        err.status = 400;
        throw err;
      }

      // Validate each color variant
      for (const cv of processedColorVariants) {
        if (!cv.colorName || cv.colorName.trim() === '') {
          const err = new Error('All color variants must have a color name');
          err.status = 400;
          throw err;
        }

        // Validate size variants for this color
        const sizeNames = new Set();
        for (const sv of cv.sizeVariants) {
          if (!sv.size || sv.size.trim() === '') {
            const err = new Error(`Size variant for color "${cv.colorName}" must have a size name`);
            err.status = 400;
            throw err;
          }

          // Check for duplicate sizes
          if (sizeNames.has(sv.size.trim())) {
            const err = new Error(`Duplicate size "${sv.size}" found for color "${cv.colorName}"`);
            err.status = 400;
            throw err;
          }
          sizeNames.add(sv.size.trim());

          // Validate pricing consistency
          if (sv.price !== null && sv.price !== undefined) {
            if (sv.price < 0) {
              const err = new Error(`Price for size "${sv.size}" in color "${cv.colorName}" cannot be negative`);
              err.status = 400;
              throw err;
            }
            if (sv.originalPrice !== null && sv.originalPrice !== undefined) {
              if (sv.originalPrice < sv.price) {
                const err = new Error(`Original price for size "${sv.size}" in color "${cv.colorName}" must be greater than or equal to the sale price`);
                err.status = 400;
                throw err;
              }
            }
          }

          // Validate stock quantity
          if (sv.stockQuantity < 0) {
            const err = new Error(`Stock quantity for size "${sv.size}" in color "${cv.colorName}" cannot be negative`);
            err.status = 400;
            throw err;
          }
        }
      }

      // Calculate total stock quantity from all variants
      let totalVariantStock = 0;
      processedColorVariants.forEach(cv => {
        cv.sizeVariants.forEach(sv => {
          totalVariantStock += sv.stockQuantity;
        });
      });

      // If variants are provided, use variant stock as base stock
      if (stockQuantity === undefined || stockQuantity === null) {
        stockQuantity = totalVariantStock;
      }
    }

    // Calculate stock status
    const stockStatus = stockQuantity === 0
      ? 'out_of_stock'
      : stockQuantity <= 10
        ? 'low_stock'
        : 'in_stock';

    // Automated SKU Selection
    const finalSku = (sku && sku.trim())
      ? sku.trim().toUpperCase()
      : await generateSKU(name, vendorId);

    // Get vendor name
    const Vendor = (await import('../models/Vendor.model.js')).default;
    const vendor = await Vendor.findById(vendorId);
    const vendorName = vendor?.businessName || vendor?.storeName || '';

    // Debug: Log category data before creating product
    console.log('📝 Creating product with categories:', {
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      subSubCategoryId: subSubCategoryId || null,
      generatedSku: finalSku
    });

    // Create product
    const product = await Product.create({
      name: name.trim(),
      sku: finalSku,
      unit: unit || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      image: imageUrl,
      imagePublicId: imagePublicId,
      images: imageUrls,
      imagesPublicIds: imagePublicIds,
      description: description || '',
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      // Ensure subSubCategoryId is properly set (not empty string, not undefined)
      subSubCategoryId: (subSubCategoryId && subSubCategoryId.toString().trim() !== '')
        ? subSubCategoryId
        : null,
      brandId: brandId || null,
      stock: stock || stockStatus,
      stockQuantity: parseInt(stockQuantity),
      totalAllowedQuantity: totalAllowedQuantity ? parseInt(totalAllowedQuantity) : null,
      minimumOrderQuantity: minimumOrderQuantity ? parseInt(minimumOrderQuantity) : null,
      warrantyPeriod: warrantyPeriod || null,
      guaranteePeriod: guaranteePeriod || null,
      hsnCode: hsnCode || null,
      flashSale: flashSale || false,
      isNew: isNew || false,
      isTrending: isTrending || false,
      isVisible: isVisible !== undefined ? isVisible : true,
      codAllowed: codAllowed !== undefined ? codAllowed : true,
      returnable: returnable !== undefined ? returnable : true,
      cancelable: cancelable !== undefined ? cancelable : true,
      taxIncluded: taxIncluded || false,
      variants: {
        ...(variants || {
          sizes: [],
          colors: [],
          materials: [],
          prices: {},
          defaultVariant: {},
        }),
        ...(processedColorVariants.length > 0 && { colorVariants: processedColorVariants }),
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
      isCouponEligible: isCouponEligible || false,
      applicableCoupons: applicableCoupons || [],
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
      sku,
      unit,
      price,
      originalPrice,
      image,
      images,
      categoryId,
      subcategoryId,
      subSubCategoryId,
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
      isTrending,
      isFeatured,
      isVisible,
      codAllowed,
      returnable,
      cancelable,
      taxIncluded,
      totalAllowedQuantity,
      minimumOrderQuantity,
      hasSizes,
      productType,
      isCouponEligible,
      applicableCoupons,
    } = productData;

    // Validate category if provided
    let validatedCategoryId = null;
    if (categoryId) {
      // Handle categoryId - it might be an object, string, or already an ObjectId
      let categoryIdToCheck = categoryId;
      if (typeof categoryId === 'object' && categoryId !== null) {
        categoryIdToCheck = categoryId._id || categoryId.id || categoryId;
      }
      const categoryIdStr = categoryIdToCheck?.toString() || String(categoryIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(categoryIdStr)) {
        const err = new Error('Invalid category ID format');
        err.status = 400;
        throw err;
      }
      const category = await Category.findById(categoryIdStr);
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
      // Handle subcategoryId - it might be an object, string, or already an ObjectId
      let subcategoryIdToCheck = subcategoryId;
      if (typeof subcategoryId === 'object' && subcategoryId !== null) {
        subcategoryIdToCheck = subcategoryId._id || subcategoryId.id || subcategoryId;
      }
      const subcategoryIdStr = subcategoryIdToCheck?.toString() || String(subcategoryIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(subcategoryIdStr)) {
        const err = new Error('Invalid subcategory ID format');
        err.status = 400;
        throw err;
      }
      const subcategory = await Category.findById(subcategoryIdStr);
      if (!subcategory) {
        const err = new Error('Subcategory not found');
        err.status = 404;
        throw err;
      }
      validatedSubcategoryId = subcategory._id;
    }

    // Validate sub-subcategory if provided
    let validatedSubSubCategoryId = null;
    if (subSubCategoryId) {
      // Handle subSubCategoryId - it might be an object, string, or already an ObjectId
      let subSubCategoryIdToCheck = subSubCategoryId;
      if (typeof subSubCategoryId === 'object' && subSubCategoryId !== null) {
        subSubCategoryIdToCheck = subSubCategoryId._id || subSubCategoryId.id || subSubCategoryId;
      }
      const subSubCategoryIdStr = subSubCategoryIdToCheck?.toString() || String(subSubCategoryIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(subSubCategoryIdStr)) {
        const err = new Error('Invalid sub-subcategory ID format');
        err.status = 400;
        throw err;
      }
      const subSubCategory = await Category.findById(subSubCategoryIdStr);
      if (!subSubCategory) {
        const err = new Error('Sub-subcategory not found');
        err.status = 404;
        throw err;
      }
      validatedSubSubCategoryId = subSubCategory._id;
    }

    // Validate brand if provided
    let validatedBrandId = null;
    if (brandId) {
      // Handle brandId - it might be an object, string, or already an ObjectId
      let brandIdToCheck = brandId;
      if (typeof brandId === 'object' && brandId !== null) {
        // If it's an object, extract the _id or id field
        brandIdToCheck = brandId._id || brandId.id || brandId;
      }
      // Convert to string and validate ObjectId format
      const brandIdStr = brandIdToCheck?.toString() || String(brandIdToCheck);
      if (!mongoose.Types.ObjectId.isValid(brandIdStr)) {
        const err = new Error('Invalid brand ID format');
        err.status = 400;
        throw err;
      }
      const brand = await Brand.findById(brandIdStr);
      if (!brand || !brand.isActive) {
        const err = new Error('Brand not found or inactive');
        err.status = 404;
        throw err;
      }
      validatedBrandId = brand._id;
    }

    // Validate SKU uniqueness if provided
    if (sku !== undefined && sku && sku.trim()) {
      const existingProduct = await Product.findOne({
        sku: sku.trim().toUpperCase(),
        isActive: true,
        _id: { $ne: productId }
      });
      if (existingProduct) {
        const err = new Error('SKU already exists. Please use a unique SKU.');
        err.status = 400;
        throw err;
      }
    }

    // Validate and process attributes if provided
    let processedAttributes = existingProduct.attributes;
    if (attributes !== undefined) {
      processedAttributes = [];
      if (attributes.length > 0) {
        for (const attr of attributes) {
          // Option 1: Predefined attribute (with attributeId)
          if (attr.attributeId) {
            const attribute = await Attribute.findById(attr.attributeId);
            if (!attribute || attribute.status !== 'active') {
              const err = new Error(`Attribute ${attr.attributeId} not found or inactive`);
              err.status = 400;
              throw err;
            }

            let validValues = [];
            if (attr.values && attr.values.length > 0) {
              validValues = await AttributeValue.find({
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
              attributeId: attribute._id,
              attributeName: attr.attributeName || attribute.name,
              values: (attr.values || []).map(val => {
                const valueObj = validValues.find(v =>
                  v._id.toString() === val.toString() || v._id.toString() === val
                );
                return valueObj ? valueObj._id : val;
              }),
            });
          }
          // Option 2: Custom attribute (with name and value)
          else if (attr.name && attr.value) {
            processedAttributes.push({
              name: attr.name,
              value: attr.value,
              group: attr.group || '',
              isRequired: attr.isRequired || false
            });
          }
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

    // Process color variants if provided
    let processedColorVariants = existingProduct.variants?.colorVariants || [];
    if (variants !== undefined && variants.colorVariants !== undefined) {
      // Delete old variant thumbnail images
      if (existingProduct.variants?.colorVariants) {
        for (const oldCv of existingProduct.variants.colorVariants) {
          if (oldCv.thumbnailImagePublicId) {
            await deleteFromCloudinary(oldCv.thumbnailImagePublicId);
          }
        }
      }

      processedColorVariants = [];
      if (Array.isArray(variants.colorVariants)) {
        for (const colorVariant of variants.colorVariants) {
          if (!colorVariant.colorName) {
            continue; // Skip invalid color variants
          }

          // Upload thumbnail image if provided
          let thumbnailImageUrl = null;
          let thumbnailImagePublicId = null;
          if (colorVariant.thumbnailImage) {
            if (colorVariant.thumbnailImage.startsWith('data:') || colorVariant.thumbnailImage.startsWith('http')) {
              const uploadResult = await uploadBase64ToCloudinary(colorVariant.thumbnailImage, 'products/variants');
              thumbnailImageUrl = uploadResult.secure_url;
              thumbnailImagePublicId = uploadResult.public_id;
            } else {
              thumbnailImageUrl = colorVariant.thumbnailImage;
            }
          }

          // Process size variants for this color
          const processedSizeVariants = [];
          if (colorVariant.sizeVariants && Array.isArray(colorVariant.sizeVariants)) {
            for (const sizeVariant of colorVariant.sizeVariants) {
              if (!sizeVariant.size || sizeVariant.stockQuantity === undefined) {
                continue; // Skip invalid size variants
              }

              // Calculate stock status for size variant
              const sizeStockStatus = sizeVariant.stockQuantity === 0
                ? 'out_of_stock'
                : sizeVariant.stockQuantity <= 10
                  ? 'low_stock'
                  : 'in_stock';

              processedSizeVariants.push({
                size: sizeVariant.size.trim(),
                price: sizeVariant.price !== undefined && sizeVariant.price !== null
                  ? parseFloat(sizeVariant.price)
                  : null,
                originalPrice: sizeVariant.originalPrice !== undefined && sizeVariant.originalPrice !== null
                  ? parseFloat(sizeVariant.originalPrice)
                  : null,
                stockQuantity: parseInt(sizeVariant.stockQuantity),
                stockStatus: sizeVariant.stockStatus || sizeStockStatus,
              });
            }
          }

          processedColorVariants.push({
            colorName: colorVariant.colorName.trim(),
            colorCode: colorVariant.colorCode ? colorVariant.colorCode.trim() : null,
            thumbnailImage: thumbnailImageUrl,
            thumbnailImagePublicId: thumbnailImagePublicId,
            sizeVariants: processedSizeVariants,
          });
        }
      }

      // Validate variation consistency
      if (processedColorVariants.length > 0) {
        const hasValidVariants = processedColorVariants.some(cv => cv.sizeVariants.length > 0);
        if (!hasValidVariants) {
          const err = new Error('At least one color variant must have size variants');
          err.status = 400;
          throw err;
        }

        // Validate each color variant
        for (const cv of processedColorVariants) {
          if (!cv.colorName || cv.colorName.trim() === '') {
            const err = new Error('All color variants must have a color name');
            err.status = 400;
            throw err;
          }

          // Validate size variants for this color
          const sizeNames = new Set();
          for (const sv of cv.sizeVariants) {
            if (!sv.size || sv.size.trim() === '') {
              const err = new Error(`Size variant for color "${cv.colorName}" must have a size name`);
              err.status = 400;
              throw err;
            }

            // Check for duplicate sizes
            if (sizeNames.has(sv.size.trim())) {
              const err = new Error(`Duplicate size "${sv.size}" found for color "${cv.colorName}"`);
              err.status = 400;
              throw err;
            }
            sizeNames.add(sv.size.trim());

            // Validate pricing consistency
            if (sv.price !== null && sv.price !== undefined) {
              if (sv.price < 0) {
                const err = new Error(`Price for size "${sv.size}" in color "${cv.colorName}" cannot be negative`);
                err.status = 400;
                throw err;
              }
              if (sv.originalPrice !== null && sv.originalPrice !== undefined) {
                if (sv.originalPrice < sv.price) {
                  const err = new Error(`Original price for size "${sv.size}" in color "${cv.colorName}" must be greater than or equal to the sale price`);
                  err.status = 400;
                  throw err;
                }
              }
            }

            // Validate stock quantity
            if (sv.stockQuantity < 0) {
              const err = new Error(`Stock quantity for size "${sv.size}" in color "${cv.colorName}" cannot be negative`);
              err.status = 400;
              throw err;
            }
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

    // Automated SKU Handling for Updates
    let finalSku = existingProduct.sku;
    if (sku && sku.trim()) {
      // If a new SKU is explicitly provided (e.g., from admin), use it
      finalSku = sku.trim().toUpperCase();
    } else if (name && name.trim() && name.trim() !== existingProduct.name) {
      // If name changed, regenerate SKU to maintain consistency with the new name
      finalSku = await generateSKU(name.trim(), vendorId);
    } else if (!finalSku) {
      // If no SKU exists (legacy product), generate one
      finalSku = await generateSKU(name || existingProduct.name, vendorId);
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...(name !== undefined && { name: name.trim() }),
        sku: finalSku,
        ...(unit !== undefined && { unit: unit || '' }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseFloat(originalPrice) : null }),
        ...(image !== undefined && { image: imageUrl, imagePublicId: imagePublicId }),
        ...(images !== undefined && { images: imageUrls, imagesPublicIds: imagePublicIds }),
        ...(description !== undefined && { description: description || '' }),
        ...((categoryId !== undefined || subcategoryId !== undefined) && { categoryId: finalCategoryIdToUse }),
        ...(subcategoryId !== undefined && { subcategoryId: validatedSubcategoryId || null }),
        ...(subSubCategoryId !== undefined && { subSubCategoryId: validatedSubSubCategoryId || null }),
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
        ...(isTrending !== undefined && { isTrending }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isVisible !== undefined && { isVisible }),
        ...(codAllowed !== undefined && { codAllowed }),
        ...(returnable !== undefined && { returnable }),
        ...(cancelable !== undefined && { cancelable }),
        ...(taxIncluded !== undefined && { taxIncluded }),
        ...(hasSizes !== undefined && { hasSizes }),
        ...(productType !== undefined && { productType }),
        ...(variants !== undefined && {
          variants: {
            ...(variants.sizes !== undefined && { sizes: variants.sizes }),
            ...(variants.colors !== undefined && { colors: variants.colors }),
            ...(variants.materials !== undefined && { materials: variants.materials }),
            ...(variants.prices !== undefined && { prices: variants.prices }),
            ...(variants.defaultVariant !== undefined && { defaultVariant: variants.defaultVariant }),
            ...(processedColorVariants.length > 0 && { colorVariants: processedColorVariants }),
          },
        }),
        ...(tags !== undefined && { tags }),
        ...(attributes !== undefined && { attributes: processedAttributes }),
        ...(seoTitle !== undefined && { seoTitle: seoTitle || '' }),
        ...(seoTitle !== undefined && { seoTitle: seoTitle || '' }),
        ...(seoDescription !== undefined && { seoDescription: seoDescription || '' }),
        ...(isCouponEligible !== undefined && { isCouponEligible }),
        ...(applicableCoupons !== undefined && { applicableCoupons }),
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
 * Delete product (hard delete - permanently remove from database)
 * @param {String} productId - Product ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Deleted product with image public IDs
 */
export const deleteVendorProduct = async (productId, vendorId) => {
  try {
    // Find product and verify ownership
    const product = await Product.findOne({
      _id: productId,
      vendorId,
    });

    if (!product) {
      const err = new Error('Product not found or you do not have permission to delete it');
      err.status = 404;
      throw err;
    }

    // Collect image public IDs for Cloudinary deletion
    const imagePublicIds = [];

    // Add main image public_id
    if (product.imagePublicId) {
      imagePublicIds.push(product.imagePublicId);
    }

    // Add gallery image public_ids
    if (product.imagesPublicIds && Array.isArray(product.imagesPublicIds)) {
      imagePublicIds.push(...product.imagesPublicIds.filter(id => id));
    }

    // Hard delete - permanently remove from database
    await Product.findByIdAndDelete(productId);

    // Return product data with image public IDs for controller to delete from Cloudinary
    return {
      deleted: true,
      imagePublicIds,
      product: product.toObject()
    };
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid product ID');
      err.status = 400;
      throw err;
    }
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


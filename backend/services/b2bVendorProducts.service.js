import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import { sanitizeImageUrl, sanitizeImageUrls } from '../utils/imageValidation.util.js';

/**
 * Verify vendor is B2B type
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor object
 */
const verifyB2BVendor = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.status = 404;
    throw err;
  }
  if (vendor.vendorType !== 'b2b') {
    const err = new Error('Access denied. This endpoint is only for B2B vendors.');
    err.status = 403;
    throw err;
  }
  return vendor;
};

/**
 * Generate SKU for B2B product
 */
const generateSKU = async (name, vendorId) => {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const vendorSuffix = vendorId.toString().slice(-4).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  let generatedSku = `B2B-${prefix}-${vendorSuffix}-${timestamp}`;

  let isUnique = false;
  let counter = 0;
  while (!isUnique) {
    const existing = await Product.findOne({ sku: generatedSku });
    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      generatedSku = `B2B-${prefix}-${vendorSuffix}-${timestamp}-${counter}`;
    }
  }
  return generatedSku;
};

/**
 * Get all B2B vendor products
 * @param {String} vendorId - B2B Vendor ID
 * @param {Object} filters - { search, category, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getB2BVendorProducts = async (vendorId, filters = {}) => {
  try {
    // Verify vendor is B2B
    await verifyB2BVendor(vendorId);

    const {
      search = '',
      category = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query - filter by vendorId and ensure vendor is B2B
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

    // Category filter (B2B categories are stored as strings in attributes)
    // Note: B2B uses category strings, not categoryId references
    if (category && category !== 'All') {
      andConditions.push({
        'attributes': { $elemMatch: { name: 'category', value: category } },
      });
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
        .populate('vendorId', 'name storeName vendorType')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    // Sanitize product images
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
 * Get B2B product by ID
 * @param {String} productId - Product ID
 * @param {String} vendorId - B2B Vendor ID
 * @returns {Promise<Object>} Product object
 */
export const getB2BVendorProductById = async (productId, vendorId) => {
  try {
    // Verify vendor is B2B
    await verifyB2BVendor(vendorId);

    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    })
      .populate('vendorId', 'name storeName vendorType')
      .lean();

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    // Sanitize product images
    product.image = sanitizeImageUrl(product.image);
    product.images = sanitizeImageUrls(product.images || []);

    return product;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new B2B product
 * @param {Object} productData - Product data from frontend form
 * @param {String} vendorId - B2B Vendor ID
 * @returns {Promise<Object>} Created product
 */
export const createB2BVendorProduct = async (productData, vendorId) => {
  try {
    // Verify vendor is B2B
    const vendor = await verifyB2BVendor(vendorId);

    const {
      name,
      category,
      subcategory,
      moq,
      price,
      description,
      images = [],
      specifications = [],
      bulkPricing = [],
      brand,
      availability,
    } = productData;

    // Validate required fields
    if (!name || !price || !moq) {
      const err = new Error('Name, price, and MOQ are required');
      err.status = 400;
      throw err;
    }

    // Generate SKU
    const sku = await generateSKU(name, vendorId);

    // Process images - upload to Cloudinary
    let imageUrl = null;
    let imagePublicId = null;
    const imageUrls = [];
    const imagePublicIds = [];

    if (images && images.length > 0) {
      // First image is the main image
      const mainImage = images[0];
      if (mainImage && (mainImage.startsWith('data:') || mainImage.startsWith('http'))) {
        const uploadResult = await uploadBase64ToCloudinary(mainImage, 'products/b2b');
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }

      // Upload remaining gallery images
      for (let i = 1; i < images.length; i++) {
        const img = images[i];
        if (img && (img.startsWith('data:') || img.startsWith('http'))) {
          const uploadResult = await uploadBase64ToCloudinary(img, 'products/b2b/gallery');
          imageUrls.push(uploadResult.secure_url);
          imagePublicIds.push(uploadResult.public_id);
        } else if (img && img.startsWith('http')) {
          imageUrls.push(img);
        }
      }
    }

    // Process specifications into attributes array
    const processedAttributes = [];
    if (specifications && Array.isArray(specifications)) {
      specifications.forEach(spec => {
        if (spec.name && spec.value) {
          processedAttributes.push({
            attributeName: spec.name,
            name: spec.name,
            value: spec.value,
          });
        }
      });
    }

    // Add category and subcategory to attributes
    if (category) {
      processedAttributes.push({
        attributeName: 'category',
        name: 'category',
        value: category,
      });
    }
    if (subcategory) {
      processedAttributes.push({
        attributeName: 'subcategory',
        name: 'subcategory',
        value: subcategory,
      });
    }

    // Process bulk pricing - store in variants or attributes
    // Store bulk pricing as custom attribute for easy access
    if (bulkPricing && Array.isArray(bulkPricing) && bulkPricing.length > 0) {
      const validBulkPricing = bulkPricing.filter(tier => tier.minQty && tier.price);
      if (validBulkPricing.length > 0) {
        processedAttributes.push({
          attributeName: 'bulkPricing',
          name: 'bulkPricing',
          value: JSON.stringify(validBulkPricing),
        });
      }
    }

    // Determine stock status
    let stock = 'in_stock';
    let stockQuantity = parseInt(moq) || 0;
    if (availability === 'Out of Stock') {
      stock = 'out_of_stock';
      stockQuantity = 0;
    } else if (availability === 'Available on Order') {
      stock = 'pre_order';
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      sku,
      price: parseFloat(price),
      description: description || '',
      image: imageUrl,
      imagePublicId: imagePublicId,
      images: imageUrls,
      imagesPublicIds: imagePublicIds,
      minimumOrderQuantity: parseInt(moq) || 1,
      stockQuantity: stockQuantity,
      stock: stock,
      attributes: processedAttributes,
      brandName: brand || '',
      vendorId,
      vendorName: vendor.storeName || vendor.name,
      isActive: true,
      isVisible: stock !== 'out_of_stock', // Auto-hide out of stock items
      codAllowed: false, // B2B typically doesn't use COD
      returnable: true,
      cancelable: true,
    });

    return product.toObject();
  } catch (error) {
    throw error;
  }
};

/**
 * Update B2B product
 * @param {String} productId - Product ID
 * @param {Object} productData - Update data
 * @param {String} vendorId - B2B Vendor ID
 * @returns {Promise<Object>} Updated product
 */
export const updateB2BVendorProduct = async (productId, productData, vendorId) => {
  try {
    // Verify vendor is B2B
    const vendor = await verifyB2BVendor(vendorId);

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
      category,
      subcategory,
      moq,
      price,
      description,
      images,
      specifications,
      bulkPricing,
      brand,
      availability,
    } = productData;

    // Update fields
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description || '';
    if (brand !== undefined) updateData.brandName = brand || '';
    if (moq !== undefined) updateData.minimumOrderQuantity = parseInt(moq) || 1;

    // Process images if provided
    if (images !== undefined && Array.isArray(images)) {
      // Delete old images from Cloudinary
      if (existingProduct.imagePublicId) {
        try {
          await deleteFromCloudinary(existingProduct.imagePublicId);
        } catch (e) {
          console.error('Failed to delete old main image:', e.message);
        }
      }
      if (existingProduct.imagesPublicIds && existingProduct.imagesPublicIds.length > 0) {
        for (const publicId of existingProduct.imagesPublicIds) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (e) {
            console.error('Failed to delete old gallery image:', e.message);
          }
        }
      }

      // Upload new images
      let imageUrl = null;
      let imagePublicId = null;
      const imageUrls = [];
      const imagePublicIds = [];

      if (images.length > 0) {
        const mainImage = images[0];
        if (mainImage && (mainImage.startsWith('data:') || mainImage.startsWith('http'))) {
          const uploadResult = await uploadBase64ToCloudinary(mainImage, 'products/b2b');
          imageUrl = uploadResult.secure_url;
          imagePublicId = uploadResult.public_id;
        } else if (mainImage && mainImage.startsWith('http')) {
          imageUrl = mainImage;
        }

        for (let i = 1; i < images.length; i++) {
          const img = images[i];
          if (img && (img.startsWith('data:') || img.startsWith('http'))) {
            const uploadResult = await uploadBase64ToCloudinary(img, 'products/b2b/gallery');
            imageUrls.push(uploadResult.secure_url);
            imagePublicIds.push(uploadResult.public_id);
          } else if (img && img.startsWith('http')) {
            imageUrls.push(img);
          }
        }
      }

      updateData.image = imageUrl;
      updateData.imagePublicId = imagePublicId;
      updateData.images = imageUrls;
      updateData.imagesPublicIds = imagePublicIds;
    }

    // Process specifications
    if (specifications !== undefined) {
      const processedAttributes = [];
      if (Array.isArray(specifications)) {
        specifications.forEach(spec => {
          if (spec.name && spec.value) {
            processedAttributes.push({
              attributeName: spec.name,
              name: spec.name,
              value: spec.value,
            });
          }
        });
      }

      // Add category and subcategory
      if (category) {
        processedAttributes.push({
          attributeName: 'category',
          name: 'category',
          value: category,
        });
      }
      if (subcategory) {
        processedAttributes.push({
          attributeName: 'subcategory',
          name: 'subcategory',
          value: subcategory,
        });
      }

      // Add bulk pricing
      if (bulkPricing && Array.isArray(bulkPricing) && bulkPricing.length > 0) {
        const validBulkPricing = bulkPricing.filter(tier => tier.minQty && tier.price);
        if (validBulkPricing.length > 0) {
          processedAttributes.push({
            attributeName: 'bulkPricing',
            name: 'bulkPricing',
            value: JSON.stringify(validBulkPricing),
          });
        }
      }

      updateData.attributes = processedAttributes;
    }

    // Update stock status
    if (availability !== undefined) {
      let stock = 'in_stock';
      let stockQuantity = updateData.minimumOrderQuantity || existingProduct.minimumOrderQuantity || 1;
      if (availability === 'Out of Stock') {
        stock = 'out_of_stock';
        stockQuantity = 0;
      } else if (availability === 'Available on Order') {
        stock = 'pre_order';
      }
      updateData.stock = stock;
      updateData.stockQuantity = stockQuantity;
      updateData.isVisible = stock !== 'out_of_stock';
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('vendorId', 'name storeName vendorType')
      .lean();

    // Sanitize images
    updatedProduct.image = sanitizeImageUrl(updatedProduct.image);
    updatedProduct.images = sanitizeImageUrls(updatedProduct.images || []);

    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete B2B product
 * @param {String} productId - Product ID
 * @param {String} vendorId - B2B Vendor ID
 * @returns {Promise<Object>} { imagePublicIds }
 */
export const deleteB2BVendorProduct = async (productId, vendorId) => {
  try {
    // Verify vendor is B2B
    await verifyB2BVendor(vendorId);

    // Find product
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

    // Collect image public IDs for deletion
    const imagePublicIds = [];
    if (product.imagePublicId) {
      imagePublicIds.push(product.imagePublicId);
    }
    if (product.imagesPublicIds && product.imagesPublicIds.length > 0) {
      imagePublicIds.push(...product.imagesPublicIds);
    }

    // Soft delete - set isActive to false
    product.isActive = false;
    await product.save();

    return { imagePublicIds };
  } catch (error) {
    throw error;
  }
};

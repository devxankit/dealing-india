import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import { sanitizeImageUrl, sanitizeImageUrls } from '../utils/imageValidation.util.js';
import subscriptionService from './subscription.service.js';

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
          { category: { $regex: search, $options: 'i' } },
          { subcategory: { $regex: search, $options: 'i' } }
        ],
      });
    }

    // Category filter
    if (category && category !== 'All') {
      const categoryRegex = new RegExp(`^${category}$`, 'i');
      andConditions.push({
        $or: [
          { category: categoryRegex },
          { 'attributes': { $elemMatch: { name: 'category', value: categoryRegex } } } // Backward compatibility
        ]
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
    const sanitizedProducts = products.map(product => {
      // Normalize for frontend consistency if needed
      const feCategory = product.category || product.attributes?.find(a => a.name === 'category')?.value;
      const feSubcategory = product.subcategory || product.attributes?.find(a => a.name === 'subcategory')?.value;

      return {
        ...product,
        category: feCategory,
        subcategory: feSubcategory,
        image: sanitizeImageUrl(product.image),
        images: sanitizeImageUrls(product.images || []),
      };
    });

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

    // Normalize category/subcategory/bulkPricing for consistency if they were in attributes
    if (!product.category) product.category = product.attributes?.find(a => a.name === 'category')?.value;
    if (!product.subcategory) product.subcategory = product.attributes?.find(a => a.name === 'subcategory')?.value;
    if (!product.bulkPricing || product.bulkPricing.length === 0) {
      const bpAttr = product.attributes?.find(a => a.name === 'bulkPricing')?.value;
      if (bpAttr) product.bulkPricing = bpAttr;
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
    const {
      name,
      price,
      moq,
    } = productData;

    // Validate required fields early
    if (!name || (productData.formType !== 'shop-listing' && (!price || !moq))) {
      const err = new Error('Name, price, and MOQ are required for standard listings');
      err.status = 400;
      throw err;
    }

    // Parallelize all initial checks and generations for maximum speed
    const [vendor, subscription, activeProductCount, sku] = await Promise.all([
      verifyB2BVendor(vendorId),
      subscriptionService.getVendorSubscription(vendorId),
      Product.countDocuments({ vendorId, isActive: true }),
      generateSKU(name, vendorId)
    ]);

    // Temporarily disabled subscription/plan checks
    /*
    // 1. Strictly check for an ACTIVE B2B subscription
    if (!subscription || subscription.status !== 'active' || !subscription.planId) {
      const err = new Error('Please purchase a subscription plan to add products.');
      err.status = 403;
      throw err;
    }

    const planName = subscription.planId.name ? subscription.planId.name.trim() : '';

    // 2. Apply plan-specific limits
    if (planName.toLowerCase().includes('basic')) {
      if (activeProductCount >= 50) {
        const err = new Error('You have reached your Basic plan limit (50 products). Please upgrade your plan.');
        err.status = 403;
        throw err;
      }
    } else if (planName.toLowerCase().includes('silver')) {
      if (activeProductCount >= 100) {
        const err = new Error('You have reached your Silver plan limit (100 products). Please upgrade your plan.');
        err.status = 403;
        throw err;
      }
    }
    */

    const {
      category,
      subcategory,
      description,
      images = [],
      specifications = [],
      bulkPricing = [],
      brand,
      availability,
      unit,
      minPrice,
      maxPrice,
      items: shopItems,
      shopUnitId,
    } = productData;

    // Handle ShopUnit creation/update - Enforce ONE shop per vendor
    let internalShopUnitId = shopUnitId;
    if (formType === 'shop-listing' && name) {
      const ShopUnit = (await import('../models/ShopUnit.model.js')).default;
      let shopUnit = await ShopUnit.findOne({ vendorId });

      const unitData = {
        name: name.trim(),
        description: description || '',
        minPrice: minPrice ? parseFloat(minPrice) : 0,
        maxPrice: maxPrice ? parseFloat(maxPrice) : 0,
        vendorId,
      };

      if (shopUnit) {
        await ShopUnit.findByIdAndUpdate(shopUnit._id, unitData);
        internalShopUnitId = shopUnit._id;
      } else {
        const newUnit = await ShopUnit.create(unitData);
        internalShopUnitId = newUnit._id;
      }
    }

    // Process images - upload to Cloudinary
    let imageUrl = null;
    let imagePublicId = null;
    const imageUrls = [];
    const imagePublicIds = [];

    // Helper for safe uploads
    const safeUpload = async (base64Data, folder) => {
      try {
        if (!base64Data) return null;

        // Ensure it is a valid base64 data URI
        if (!base64Data.startsWith('data:image')) {
          if (base64Data.startsWith('http')) return { secure_url: base64Data, public_id: null };
          console.warn('[B2B Product Upload] Skipping invalid image data format');
          return null;
        }

        const result = await uploadBase64ToCloudinary(base64Data, folder);
        if (!result || !result.secure_url) {
          throw new Error('Cloudinary upload returned invalid result');
        }
        return result;
      } catch (err) {
        console.error('[B2B Product Upload] Individual image upload failed:', err.message);
        throw err;
      }
    };

    if (images && images.length > 0) {
      // First image is the main image
      const mainImage = images[0];
      if (mainImage) {
        const uploadResult = await safeUpload(mainImage, 'products/b2b');
        if (uploadResult) {
          imageUrl = uploadResult.secure_url;
          imagePublicId = uploadResult.public_id;
        }
      }

      // Upload remaining gallery images
      const galleryUploads = images.slice(1).map(img => safeUpload(img, 'products/b2b/gallery'));
      const results = await Promise.allSettled(galleryUploads);

      // Check for failures
      const failedUploads = results.filter(r => r.status === 'rejected');
      if (failedUploads.length > 0) {
        console.error(`[B2B Product Upload] ${failedUploads.length} gallery images failed to upload.`);
        const firstError = failedUploads[0].reason;
        throw new Error(`Image upload failed: ${firstError.message}`);
      }

      // Collect successful uploads
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          imageUrls.push(res.value.secure_url);
          if (res.value.public_id) {
            imagePublicIds.push(res.value.public_id);
          }
        }
      });
    }

    // Validate that we have a main image if images were provided
    if (images && images.length > 0 && !imageUrl) {
      throw new Error('Failed to upload main product image');
    }
    // Process specifications into attributes array
    const isPackingMaterial = vendor?.businessType?.toLowerCase() === "packing material";
    const processedAttributes = [];
    if (specifications && Array.isArray(specifications)) {
      specifications.forEach(spec => {
        if (!spec.name || !spec.value) return;

        const specNameLower = spec.name.toLowerCase();

        // Skip specific fields for packing material
        if (isPackingMaterial && (specNameLower === 'pattern' || specNameLower === 'fabric')) {
          return;
        }

        if (specNameLower !== 'color') {
          processedAttributes.push({
            attributeName: spec.name,
            name: spec.name,
            value: spec.value,
          });
        }
      });
    }

    // We no longer push category/subcategory/bulkPricing to attributes
    // Use the native schema fields instead

    // Determine stock status
    let stock = 'in_stock';
    let stockQuantity = parseInt(moq) || 0;
    if (availability === 'Out of Stock') {
      stock = 'out_of_stock';
      stockQuantity = 0;
    } else if (availability === 'Available on Order') {
      stock = 'pre_order';
    }

    // Process shopItems images if present
    const processedShopItems = [];
    if (shopItems && Array.isArray(shopItems)) {
      for (const item of shopItems) {
        const itemImageUrls = [];
        const itemPublicIds = [];

        if (item.images && Array.isArray(item.images)) {
          const itemUploads = item.images.map(img => safeUpload(img, 'products/b2b/items'));
          const itemResults = await Promise.allSettled(itemUploads);

          itemResults.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
              itemImageUrls.push(res.value.secure_url);
              if (res.value.public_id) {
                itemPublicIds.push(res.value.public_id);
              }
            }
          });
        }

        processedShopItems.push({
          ...item,
          images: itemImageUrls,
          imagesPublicIds: itemPublicIds,
        });
      }
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      sku,
      price: productData.formType === 'shop-listing' ? parseFloat(minPrice || 0) : parseFloat(price),
      description: description || '',
      image: imageUrl,
      imagePublicId: imagePublicId,
      images: imageUrls,
      imagesPublicIds: imagePublicIds,
      minimumOrderQuantity: productData.formType === 'shop-listing' ? 1 : (parseInt(moq) || 1),
      stockQuantity: stockQuantity,
      stock: stock,
      attributes: processedAttributes,
      brandName: brand || '',
      category: category || '',
      subcategory: subcategory || '',
      bulkPricing: bulkPricing || [],
      unit: unit || 'Pcs',
      formType: productData.formType || 'standard',
      shopUnitId: internalShopUnitId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      items: processedShopItems,
      vendorId,
      vendorName: vendor.storeName || vendor.name,
      isActive: true,
      isVisible: stock !== 'out_of_stock', // Auto-hide out of stock items
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
      formType,
      minPrice,
      maxPrice,
      items: shopItems,
    } = productData;

    // Update fields
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (productData.formType === 'shop-listing' && minPrice !== undefined) updateData.price = parseFloat(minPrice || 0);
    if (description !== undefined) updateData.description = description || '';
    if (brand !== undefined) updateData.brandName = brand || '';
    if (moq !== undefined) updateData.minimumOrderQuantity = parseInt(moq) || 1;
    if (productData.unit !== undefined) updateData.unit = productData.unit;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory;
    if (bulkPricing !== undefined) updateData.bulkPricing = bulkPricing;
    if (formType !== undefined) updateData.formType = formType;
    if (minPrice !== undefined) updateData.minPrice = minPrice ? parseFloat(minPrice) : undefined;
    if (maxPrice !== undefined) updateData.maxPrice = maxPrice ? parseFloat(maxPrice) : undefined;
    if (shopItems !== undefined) updateData.items = shopItems;


    // Process images if provided
    if (images !== undefined && Array.isArray(images)) {
      // Helper for safe uploads during update
      const safeUpload = async (base64Data, folder) => {
        try {
          if (!base64Data) return null;
          if (!base64Data.startsWith('data:image')) {
            // If it's already an HTTP URL, check if it's one of the existing ones
            if (base64Data.startsWith('http')) {
              return { secure_url: base64Data, public_id: null, isExisting: true };
            }
            return null;
          }
          return await uploadBase64ToCloudinary(base64Data, folder);
        } catch (err) {
          console.error('[B2B Product Update] Image upload failed:', err.message);
          throw err;
        }
      };

      if (shopItems !== undefined && Array.isArray(shopItems)) {
        const processedShopItems = [];
        for (const item of shopItems) {
          const itemImageUrls = [];
          const itemPublicIds = [];

          if (item.images && Array.isArray(item.images)) {
            for (const img of item.images) {
              if (img.startsWith('http')) {
                itemImageUrls.push(img);
                // Try to find existing public ID if needed, but for simplicity:
                const existingItem = existingProduct.items.find(ei => ei.images.includes(img));
                if (existingItem) {
                  const pid = existingItem.imagesPublicIds[existingItem.images.indexOf(img)];
                  if (pid) itemPublicIds.push(pid);
                }
              } else if (img.startsWith('data:image')) {
                const res = await uploadBase64ToCloudinary(img, 'products/b2b/items');
                if (res && res.secure_url) {
                  itemImageUrls.push(res.secure_url);
                  itemPublicIds.push(res.public_id);
                }
              }
            }
          }

          processedShopItems.push({
            ...item,
            images: itemImageUrls,
            imagesPublicIds: itemPublicIds,
          });
        }
        updateData.items = processedShopItems;
      }

      // Identify images to delete (those not in the new list)
      const newImageUrls = images.filter(img => img.startsWith('http'));
      const publicIdsToDelete = [];

      if (existingProduct.imagePublicId && !newImageUrls.includes(existingProduct.image)) {
        publicIdsToDelete.push(existingProduct.imagePublicId);
      }
      if (existingProduct.imagesPublicIds) {
        existingProduct.imagesPublicIds.forEach((pid, idx) => {
          if (!newImageUrls.includes(existingProduct.images[idx])) {
            publicIdsToDelete.push(pid);
          }
        });
      }

      // Delete images no longer used
      if (publicIdsToDelete.length > 0) {
        try {
          const { deleteMultipleFromCloudinary } = await import('../utils/cloudinary.util.js');
          await deleteMultipleFromCloudinary(publicIdsToDelete);
        } catch (e) {
          console.error('Failed to cleanup old images:', e.message);
        }
      }

      // Upload new images
      let imageUrl = null;
      let imagePublicId = null;
      const imageUrls = [];
      const imagePublicIds = [];

      if (images.length > 0) {
        const mainImage = images[0];
        const uploadResult = await safeUpload(mainImage, 'products/b2b');
        if (uploadResult) {
          imageUrl = uploadResult.secure_url;
          imagePublicId = uploadResult.public_id || (uploadResult.isExisting ? existingProduct.imagePublicId : null);
        }

        const galleryUploads = images.slice(1).map(img => safeUpload(img, 'products/b2b/gallery'));
        const results = await Promise.allSettled(galleryUploads);

        const failedUploads = results.filter(r => r.status === 'rejected');
        if (failedUploads.length > 0) {
          throw new Error(`Image upload failed: ${failedUploads[0].reason.message}`);
        }

        results.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value) {
            imageUrls.push(res.value.secure_url);
            const pid = res.value.public_id || (res.value.isExisting ? (existingProduct.imagesPublicIds ? existingProduct.imagesPublicIds[existingProduct.images.indexOf(res.value.secure_url)] : null) : null);
            if (pid) imagePublicIds.push(pid);
          }
        });
      }

      updateData.image = imageUrl;
      updateData.imagePublicId = imagePublicId;
      updateData.images = imageUrls;
      updateData.imagesPublicIds = imagePublicIds;
    }

    // Process specifications
    const processedAttributes = [];
    if (specifications !== undefined) {
      const isPackingMaterial = vendor?.businessType?.toLowerCase() === "packing material";

      // Add standard specifications
      if (Array.isArray(specifications)) {
        specifications.forEach(spec => {
          if (!spec.name || !spec.value) return;

          const specNameLower = spec.name.toLowerCase();

          // Skip specific fields for packing material
          if (isPackingMaterial && (specNameLower === 'pattern' || specNameLower === 'fabric')) {
            return;
          }

          if (specNameLower !== 'color') {
            processedAttributes.push({
              attributeName: spec.name,
              name: spec.name,
              value: spec.value,
            });
          }
        });
      }

      // We do NOT add category/subcategory/bulkPricing here anymore

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

    // Find product and verify ownership (check both active and inactive just in case)
    const product = await Product.findOne({
      _id: productId,
      vendorId,
    });

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    // Collect image public IDs for deletion from Cloudinary
    const imagePublicIds = [];
    if (product.imagePublicId) {
      imagePublicIds.push(product.imagePublicId);
    }
    if (product.imagesPublicIds && product.imagesPublicIds.length > 0) {
      // Filter out any null/undefined IDs
      imagePublicIds.push(...product.imagesPublicIds.filter(id => id));
    }

    // Hard delete - permanently remove from database as requested by user
    await Product.findByIdAndDelete(productId);

    return { imagePublicIds };
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid product ID');
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

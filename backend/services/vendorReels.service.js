import Reel from '../models/Reel.model.js';
import Product from '../models/Product.model.js';

/**
 * Get all reels for a vendor with optional filters
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, status, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { reels, total, page, totalPages }
 */
export const getVendorReels = async (vendorId, filters = {}) => {
  try {
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query - always filter by vendorId
    const query = { vendorId };
    const andConditions = [];

    // Search filter (by product name)
    if (search) {
      // First, find products matching search
      const products = await Product.find({
        vendorId,
        name: { $regex: search, $options: 'i' },
      }).select('_id').lean();

      const productIds = products.map(p => p._id);

      if (productIds.length > 0) {
        andConditions.push({ productId: { $in: productIds } });
      } else {
        // No products match, return empty result
        return {
          reels: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
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
    const [reels, total] = await Promise.all([
      Reel.find(query)
        .populate('productId', 'name price image')
        .populate('vendorId', 'businessName storeName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Reel.countDocuments(query),
    ]);

    // Add productName and productPrice to each reel
    const enrichedReels = reels.map(reel => ({
      ...reel,
      productName: reel.productId?.name || '',
      productPrice: reel.productId?.price || 0,
      vendorName: reel.vendorId?.businessName || reel.vendorId?.storeName || '',
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      reels: enrichedReels,
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
 * Get reel by ID (vendor-owned only)
 * @param {String} reelId - Reel ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Reel object
 */
export const getVendorReelById = async (reelId, vendorId) => {
  try {
    const reel = await Reel.findOne({
      _id: reelId,
      vendorId,
    })
      .populate('productId', 'name price image')
      .populate('vendorId', 'businessName storeName')
      .lean();

    if (!reel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    return {
      ...reel,
      productName: reel.productId?.name || '',
      productPrice: reel.productId?.price || 0,
      vendorName: reel.vendorId?.businessName || reel.vendorId?.storeName || '',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new reel for vendor
 * @param {Object} reelData - Reel data
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Created reel
 */
export const createVendorReel = async (reelData, vendorId) => {
  try {
    const {
      videoUrl,
      thumbnail,
      productId,
      status = 'draft',
      likes = 0,
      comments = 0,
      shares = 0,
      views = 0,
    } = reelData;

    // Validate required fields
    if (!videoUrl) {
      const err = new Error('Video URL is required');
      err.status = 400;
      throw err;
    }

    if (!productId) {
      const err = new Error('Product ID is required');
      err.status = 400;
      throw err;
    }

    // Validate product exists and belongs to vendor
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    });

    if (!product) {
      const err = new Error('Product not found or does not belong to vendor');
      err.status = 404;
      throw err;
    }

    // Create reel
    const reel = await Reel.create({
      videoUrl: videoUrl.trim(),
      thumbnail: thumbnail || null,
      productId,
      vendorId,
      status,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      shares: parseInt(shares) || 0,
      views: parseInt(views) || 0,
    });

    const populatedReel = await Reel.findById(reel._id)
      .populate('productId', 'name price image')
      .populate('vendorId', 'businessName storeName')
      .lean();

    return {
      ...populatedReel,
      productName: populatedReel.productId?.name || '',
      productPrice: populatedReel.productId?.price || 0,
      vendorName: populatedReel.vendorId?.businessName || populatedReel.vendorId?.storeName || '',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update reel (vendor-owned only)
 * @param {String} reelId - Reel ID
 * @param {Object} reelData - Update data
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated reel
 */
export const updateVendorReel = async (reelId, reelData, vendorId) => {
  try {
    // Verify reel exists and belongs to vendor
    const existingReel = await Reel.findOne({
      _id: reelId,
      vendorId,
    });

    if (!existingReel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    const {
      videoUrl,
      thumbnail,
      productId,
      status,
      likes,
      comments,
      shares,
      views,
    } = reelData;

    // Validate product if changed
    if (productId && productId !== existingReel.productId.toString()) {
      const product = await Product.findOne({
        _id: productId,
        vendorId,
        isActive: true,
      });

      if (!product) {
        const err = new Error('Product not found or does not belong to vendor');
        err.status = 404;
        throw err;
      }
    }

    // Update reel
    const updatedReel = await Reel.findByIdAndUpdate(
      reelId,
      {
        ...(videoUrl !== undefined && { videoUrl: videoUrl.trim() }),
        ...(thumbnail !== undefined && { thumbnail: thumbnail || null }),
        ...(productId !== undefined && { productId }),
        ...(status !== undefined && { status }),
        ...(likes !== undefined && { likes: parseInt(likes) || 0 }),
        ...(comments !== undefined && { comments: parseInt(comments) || 0 }),
        ...(shares !== undefined && { shares: parseInt(shares) || 0 }),
        ...(views !== undefined && { views: parseInt(views) || 0 }),
      },
      { new: true, runValidators: true }
    )
      .populate('productId', 'name price image')
      .populate('vendorId', 'businessName storeName')
      .lean();

    return {
      ...updatedReel,
      productName: updatedReel.productId?.name || '',
      productPrice: updatedReel.productId?.price || 0,
      vendorName: updatedReel.vendorId?.businessName || updatedReel.vendorId?.storeName || '',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete reel (vendor-owned only)
 * @param {String} reelId - Reel ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteVendorReel = async (reelId, vendorId) => {
  try {
    const reel = await Reel.findOne({
      _id: reelId,
      vendorId,
    });

    if (!reel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    await Reel.findByIdAndDelete(reelId);

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Update reel status
 * @param {String} reelId - Reel ID
 * @param {String} status - New status
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated reel
 */
export const updateVendorReelStatus = async (reelId, status, vendorId) => {
  try {
    const reel = await Reel.findOne({
      _id: reelId,
      vendorId,
    });

    if (!reel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    if (!['draft', 'active', 'archived'].includes(status)) {
      const err = new Error('Invalid status');
      err.status = 400;
      throw err;
    }

    const updatedReel = await Reel.findByIdAndUpdate(
      reelId,
      { status },
      { new: true }
    )
      .populate('productId', 'name price image')
      .populate('vendorId', 'businessName storeName')
      .lean();

    return {
      ...updatedReel,
      productName: updatedReel.productId?.name || '',
      productPrice: updatedReel.productId?.price || 0,
      vendorName: updatedReel.vendorId?.businessName || updatedReel.vendorId?.storeName || '',
    };
  } catch (error) {
    throw error;
  }
};


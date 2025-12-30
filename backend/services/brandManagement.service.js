import Brand from '../models/Brand.model.js';

/**
 * Get all brands with optional filters
 * @param {Object} filters - { search, isActive, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { brands, total, page, totalPages }
 */
export const getAllBrands = async (filters = {}) => {
  try {
    const {
      search = '',
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (isActive !== undefined && isActive !== null) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Brand.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      brands,
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
 * Get brand by ID
 * @param {String} brandId - Brand ID
 * @returns {Promise<Object>} Brand object
 */
export const getBrandById = async (brandId) => {
  try {
    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      throw new Error('Brand not found');
    }
    return brand;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid brand ID');
    }
    throw error;
  }
};

/**
 * Create a new brand
 * @param {Object} brandData - { name, logo, description, website, isActive }
 * @returns {Promise<Object>} Created brand
 */
export const createBrand = async (brandData) => {
  try {
    const { name, logo, description, website, isActive } = brandData;

    // Validate required fields
    if (!name || !name.trim()) {
      throw new Error('Brand name is required');
    }

    // Check if brand already exists
    const existingBrand = await Brand.findOne({
      name: name.trim(),
    });

    if (existingBrand) {
      throw new Error('Brand with this name already exists');
    }

    // Create brand
    const brand = await Brand.create({
      name: name.trim(),
      logo: logo || null,
      description: description || '',
      website: website || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    return brand.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Brand with this name already exists');
    }
    throw error;
  }
};

/**
 * Update brand
 * @param {String} brandId - Brand ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated brand
 */
export const updateBrand = async (brandId, updateData) => {
  try {
    const { name, logo, description, website, isActive } = updateData;

    // Build update object
    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (logo !== undefined) updateObj.logo = logo || null;
    if (description !== undefined) updateObj.description = description || '';
    if (website !== undefined) updateObj.website = website || '';
    if (isActive !== undefined) updateObj.isActive = isActive;

    // Check if name is being updated and if it conflicts
    if (name) {
      const existingBrand = await Brand.findOne({
        name: name.trim(),
        _id: { $ne: brandId },
      });

      if (existingBrand) {
        throw new Error('Brand with this name already exists');
      }
    }

    const brand = await Brand.findByIdAndUpdate(
      brandId,
      updateObj,
      { new: true, runValidators: true }
    ).lean();

    if (!brand) {
      throw new Error('Brand not found');
    }

    return brand;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid brand ID');
    }
    if (error.code === 11000) {
      throw new Error('Brand with this name already exists');
    }
    throw error;
  }
};

/**
 * Delete brand
 * @param {String} brandId - Brand ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteBrand = async (brandId) => {
  try {
    const brand = await Brand.findByIdAndDelete(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid brand ID');
    }
    throw error;
  }
};

/**
 * Bulk delete brands
 * @param {Array<String>} brandIds - Array of brand IDs
 * @returns {Promise<Object>} { deletedCount }
 */
export const bulkDeleteBrands = async (brandIds) => {
  try {
    const result = await Brand.deleteMany({
      _id: { $in: brandIds },
    });

    return { deletedCount: result.deletedCount };
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle brand status
 * @param {String} brandId - Brand ID
 * @returns {Promise<Object>} Updated brand
 */
export const toggleBrandStatus = async (brandId) => {
  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    brand.isActive = !brand.isActive;
    await brand.save();

    return brand.toObject();
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid brand ID');
    }
    throw error;
  }
};


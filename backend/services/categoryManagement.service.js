import Category from '../models/Category.model.js';

/**
 * Get all categories with optional filters
 * @param {Object} filters - { search, isActive, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { categories, total, page, totalPages }
 */
export const getAllCategories = async (filters = {}) => {
  try {
    const {
      search = '',
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'order',
      sortOrder = 'asc',
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
    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Category.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      categories,
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
 * Get category by ID
 * @param {String} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
export const getCategoryById = async (categoryId) => {
  try {
    const category = await Category.findById(categoryId).lean();
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Check if category has children
 * @param {String} categoryId - Category ID
 * @returns {Promise<Boolean>} True if has children
 */
export const hasChildren = async (categoryId) => {
  try {
    const count = await Category.countDocuments({ parentId: categoryId });
    return count > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate the depth/level of a category (1 = root, 2 = subcategory, 3 = sub-subcategory)
 * @param {String} categoryId - Category ID
 * @returns {Promise<Number>} Depth level (1, 2, or 3)
 */
export const getCategoryDepth = async (categoryId) => {
  try {
    if (!categoryId) return 1; // Root level

    let depth = 1;
    let currentCategoryId = categoryId;
    const visited = new Set();

    // Traverse up the parent chain
    while (currentCategoryId) {
      if (visited.has(currentCategoryId.toString())) {
        // Circular reference detected, return max depth to prevent infinite loop
        return 3;
      }
      visited.add(currentCategoryId.toString());

      const category = await Category.findById(currentCategoryId).lean();
      if (!category || !category.parentId) {
        break; // Reached root
      }

      depth++;
      if (depth > 3) {
        return depth; // Already exceeded max
      }
      currentCategoryId = category.parentId;
    }

    return depth;
  } catch (error) {
    throw error;
  }
};

/**
 * Check for circular parent reference
 * @param {String} categoryId - Category ID to check
 * @param {String} parentId - Parent ID to set
 * @returns {Promise<Boolean>} True if circular reference detected
 */
export const hasCircularReference = async (categoryId, parentId) => {
  try {
    if (!parentId || !categoryId) return false;

    let currentParentId = parentId;
    const visited = new Set([categoryId.toString()]);

    // Traverse up the parent chain
    while (currentParentId) {
      if (visited.has(currentParentId.toString())) {
        return true; // Circular reference detected
      }
      visited.add(currentParentId.toString());

      const parent = await Category.findById(currentParentId).lean();
      if (!parent || !parent.parentId) {
        break;
      }
      currentParentId = parent.parentId;
    }

    return false;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new category
 * @param {Object} categoryData - { name, description, image, icon, parentId, isActive, order }
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async (categoryData) => {
  try {
    const { name, description, image, icon, parentId, isActive, order, showInHeader, headerColor } = categoryData;

    // Validate required fields
    if (!name || !name.trim()) {
      throw new Error('Category name is required');
    }

    // Validate parentId if provided
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }

      // Check depth: Maximum 3 levels allowed (1 = root, 2 = subcategory, 3 = sub-subcategory)
      const parentDepth = await getCategoryDepth(parentId);
      if (parentDepth >= 3) {
        throw new Error('Maximum category depth reached. Cannot create subcategories beyond level 3.');
      }
    }

    // Get max order if not provided
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const maxOrderCategory = await Category.findOne()
        .sort({ order: -1 })
        .lean();
      finalOrder = maxOrderCategory ? (maxOrderCategory.order || 0) + 1 : 1;
    }

    // Create category
    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      image: image || null,
      imagePublicId: categoryData.imagePublicId || null,
      icon: icon || null,
      parentId: parentId || null,
      isActive: isActive !== undefined ? isActive : true,
      order: finalOrder,
      showInHeader: showInHeader !== undefined ? showInHeader : false,
      headerColor: headerColor || null,
    });

    return category.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Category with this name already exists');
    }
    throw error;
  }
};

/**
 * Update category
 * @param {String} categoryId - Category ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (categoryId, updateData) => {
  try {
    const { name, description, image, imagePublicId, icon, parentId, isActive, order, showInHeader, headerColor } = updateData;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Validate parentId if being updated
    if (parentId !== undefined) {
      // Cannot set self as parent
      if (parentId && parentId.toString() === categoryId.toString()) {
        throw new Error('Category cannot be its own parent');
      }

      // Check for circular reference
      if (parentId) {
        const isCircular = await hasCircularReference(categoryId, parentId);
        if (isCircular) {
          throw new Error('Circular parent reference detected');
        }

        const parent = await Category.findById(parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }

        // Check depth: Maximum 3 levels allowed (1 = root, 2 = subcategory, 3 = sub-subcategory)
        const parentDepth = await getCategoryDepth(parentId);
        if (parentDepth >= 3) {
          throw new Error('Maximum category depth reached. Cannot create subcategories beyond level 3.');
        }
      }
    }

    // Build update object
    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (description !== undefined) updateObj.description = description || '';
    if (image !== undefined) updateObj.image = image || null;
    if (imagePublicId !== undefined) updateObj.imagePublicId = imagePublicId || null;
    if (icon !== undefined) updateObj.icon = icon || null;
    if (parentId !== undefined) updateObj.parentId = parentId || null;
    if (isActive !== undefined) updateObj.isActive = isActive;
    if (order !== undefined) updateObj.order = order;
    if (showInHeader !== undefined) updateObj.showInHeader = showInHeader;
    if (headerColor !== undefined) updateObj.headerColor = headerColor || null;

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updateObj,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCategory) {
      throw new Error('Category not found');
    }

    return updatedCategory;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Delete category
 * @param {String} categoryId - Category ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteCategory = async (categoryId) => {
  try {
    // Check if category has children
    const hasChildrenCategories = await hasChildren(categoryId);
    if (hasChildrenCategories) {
      throw new Error('Cannot delete category with subcategories');
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Bulk delete categories
 * @param {Array<String>} categoryIds - Array of category IDs
 * @returns {Promise<Object>} { deletedCount, failedIds }
 */
export const bulkDeleteCategories = async (categoryIds) => {
  try {
    const failedIds = [];
    const validIds = [];

    // Check each category for children
    for (const id of categoryIds) {
      const hasChildrenCategories = await hasChildren(id);
      if (hasChildrenCategories) {
        failedIds.push(id);
      } else {
        validIds.push(id);
      }
    }

    if (validIds.length === 0) {
      throw new Error('No categories can be deleted (all have subcategories)');
    }

    // Get categories to delete (for image cleanup)
    const categoriesToDelete = await Category.find({
      _id: { $in: validIds },
    }).lean();

    const result = await Category.deleteMany({
      _id: { $in: validIds },
    });

    // Return imagePublicIds for cleanup (controller will handle Cloudinary deletion)
    const imagePublicIds = categoriesToDelete
      .map(cat => cat.imagePublicId)
      .filter(id => id);

    return {
      deletedCount: result.deletedCount,
      failedIds,
      imagePublicIds, // For Cloudinary cleanup
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk update category order
 * @param {Array<Object>} orderUpdates - Array of { id, order }
 * @returns {Promise<Object>} { updatedCount, categories }
 */
export const bulkUpdateCategoryOrder = async (orderUpdates) => {
  try {
    if (!orderUpdates || !Array.isArray(orderUpdates) || orderUpdates.length === 0) {
      throw new Error('Order updates array is required');
    }

    // Update each category's order
    const updatePromises = orderUpdates.map(({ id, order }) => {
      return Category.findByIdAndUpdate(
        id,
        { order: parseInt(order) },
        { new: true, runValidators: true }
      );
    });

    const updatedCategories = await Promise.all(updatePromises);

    // Filter out null results (categories not found)
    const validCategories = updatedCategories.filter(cat => cat !== null);

    if (validCategories.length !== orderUpdates.length) {
      throw new Error('Some categories were not found');
    }

    return {
      updatedCount: validCategories.length,
      categories: validCategories.map(cat => cat.toObject()),
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID format');
    }
    throw error;
  }
};


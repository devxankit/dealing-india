import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/productManagement.service.js';
import {
  uploadBase64ToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  isBase64DataUrl,
  extractPublicIdFromUrl,
} from '../../utils/cloudinary.util.js';

/**
 * Get all products with filters
 * GET /api/admin/products
 */
export const getProducts = async (req, res, next) => {
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
    } = req.query;

    const result = await getAllProducts({
      search,
      stock,
      categoryId,
      brandId,
      page,
      limit,
      sortBy,
      sortOrder,
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
 * Get product by ID
 * GET /api/admin/products/:id
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await getProductById(id);

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
 * Create a new product
 * POST /api/admin/products
 */
export const create = async (req, res, next) => {
  try {
    const productData = { ...req.body };

    // Handle main image upload to Cloudinary if base64 is provided
    if (productData.image && isBase64DataUrl(productData.image)) {
      try {
        const uploadResult = await uploadBase64ToCloudinary(
          productData.image,
          'products'
        );
        productData.image = uploadResult.secure_url;
        productData.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Main image upload failed: ${uploadError.message}`,
        });
      }
    }

    // Handle gallery images upload to Cloudinary if base64 array is provided
    if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
      try {
        const uploadPromises = productData.images.map(async (img) => {
          if (isBase64DataUrl(img)) {
            const uploadResult = await uploadBase64ToCloudinary(img, 'products/gallery');
            return uploadResult.secure_url;
          } else if (img.startsWith('http://') || img.startsWith('https://')) {
            // Already a URL, return as is
            return img;
          }
          return img;
        });

        productData.images = await Promise.all(uploadPromises);

        // Extract public_ids for gallery images
        productData.imagesPublicIds = productData.images
          .map(url => extractPublicIdFromUrl(url))
          .filter(id => id);
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Gallery images upload failed: ${uploadError.message}`,
        });
      }
    }

    const product = await createProduct(productData);

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
 * Update product
 * PUT /api/admin/products/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get existing product to check for old images
    const existingProduct = await getProductById(id);

    // Handle main image upload to Cloudinary if new base64 image is provided
    if (updateData.image !== undefined) {
      if (updateData.image && isBase64DataUrl(updateData.image)) {
        try {
          // Upload new image to Cloudinary
          const uploadResult = await uploadBase64ToCloudinary(
            updateData.image,
            'products'
          );
          updateData.image = uploadResult.secure_url;
          updateData.imagePublicId = uploadResult.public_id;

          // Delete old image from Cloudinary if it exists
          if (existingProduct.imagePublicId) {
            await deleteFromCloudinary(existingProduct.imagePublicId);
          }
        } catch (uploadError) {
          return res.status(400).json({
            success: false,
            message: `Main image upload failed: ${uploadError.message}`,
          });
        }
      } else if (!updateData.image) {
        // Image is being removed
        if (existingProduct.imagePublicId) {
          await deleteFromCloudinary(existingProduct.imagePublicId);
        }
        updateData.imagePublicId = null;
      } else if (updateData.image && (updateData.image.startsWith('http://') || updateData.image.startsWith('https://'))) {
        // Already a URL, extract public_id if Cloudinary
        const publicId = extractPublicIdFromUrl(updateData.image);
        if (publicId) {
          updateData.imagePublicId = publicId;
        }
      }
    }

    // Handle gallery images upload to Cloudinary if new array is provided
    if (updateData.images !== undefined && Array.isArray(updateData.images)) {
      try {
        // Get old gallery public_ids that are being removed
        const oldPublicIds = existingProduct.imagesPublicIds || [];
        const newUrls = [];

        // Upload new base64 images and collect URLs
        const uploadPromises = updateData.images.map(async (img) => {
          if (isBase64DataUrl(img)) {
            const uploadResult = await uploadBase64ToCloudinary(img, 'products/gallery');
            return uploadResult.secure_url;
          } else if (img.startsWith('http://') || img.startsWith('https://')) {
            return img;
          }
          return img;
        });

        updateData.images = await Promise.all(uploadPromises);

        // Extract public_ids for new gallery images
        updateData.imagesPublicIds = updateData.images
          .map(url => extractPublicIdFromUrl(url))
          .filter(id => id);

        // Delete old gallery images that are no longer in the new array
        const publicIdsToDelete = oldPublicIds.filter(
          oldId => !updateData.imagesPublicIds.includes(oldId)
        );
        if (publicIdsToDelete.length > 0) {
          await deleteMultipleFromCloudinary(publicIdsToDelete);
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Gallery images upload failed: ${uploadError.message}`,
        });
      }
    }

    const product = await updateProduct(id, updateData);

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
 * Delete product
 * DELETE /api/admin/products/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get product to check for images before deletion
    const product = await getProductById(id);

    // Delete product (service handles validation)
    await deleteProduct(id);

    // Delete all images from Cloudinary
    const publicIdsToDelete = [];

    // Add main image public_id
    if (product.imagePublicId) {
      publicIdsToDelete.push(product.imagePublicId);
    }

    // Add gallery image public_ids
    if (product.imagesPublicIds && Array.isArray(product.imagesPublicIds)) {
      publicIdsToDelete.push(...product.imagesPublicIds.filter(id => id));
    }

    // Delete all images from Cloudinary
    if (publicIdsToDelete.length > 0) {
      await deleteMultipleFromCloudinary(publicIdsToDelete);
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


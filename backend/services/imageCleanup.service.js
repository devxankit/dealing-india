import Product from '../models/Product.model.js';
import { validateImageUrl, validateImageUrls } from '../utils/imageValidation.util.js';

/**
 * Clean broken images from all products in database
 * This service validates Cloudinary image URLs and removes broken ones
 * @param {Object} options - { dryRun: boolean, batchSize: number }
 * @returns {Promise<Object>} { cleaned: number, broken: number, errors: Array }
 */
export const cleanBrokenProductImages = async (options = {}) => {
  const { dryRun = false, batchSize = 50 } = options;
  
  let cleaned = 0;
  let broken = 0;
  const errors = [];

  try {
    // Get total count of products
    const totalProducts = await Product.countDocuments({});
    console.log(`📊 Total products to check: ${totalProducts}`);

    // Process in batches to avoid memory issues
    let processed = 0;
    let page = 0;

    while (processed < totalProducts) {
      const products = await Product.find({})
        .select('_id name image images imagePublicId imagesPublicIds')
        .skip(page * batchSize)
        .limit(batchSize)
        .lean();

      if (products.length === 0) break;

      for (const product of products) {
        try {
          let needsUpdate = false;
          const updateData = {};

          // Validate main image
          if (product.image) {
            const isValid = await validateImageUrl(product.image);
            if (!isValid) {
              console.log(`❌ Broken main image found for product ${product.name} (${product._id}): ${product.image}`);
              updateData.image = null;
              updateData.imagePublicId = null;
              needsUpdate = true;
              broken++;
            }
          }

          // Validate gallery images
          if (product.images && product.images.length > 0) {
            const { valid, invalid } = await validateImageUrls(product.images);
            
            if (invalid.length > 0) {
              console.log(`❌ Broken gallery images found for product ${product.name} (${product._id}): ${invalid.length} broken`);
              
              // Update images array to only include valid ones
              updateData.images = valid;
              
              // Update imagesPublicIds to match valid images
              if (product.imagesPublicIds && product.imagesPublicIds.length > 0) {
                const validPublicIds = product.images
                  .map((url, index) => {
                    if (valid.includes(url)) {
                      return product.imagesPublicIds[index];
                    }
                    return null;
                  })
                  .filter(id => id !== null);
                
                updateData.imagesPublicIds = validPublicIds;
              } else {
                updateData.imagesPublicIds = [];
              }
              
              needsUpdate = true;
              broken += invalid.length;
            }
          }

          // Update product if needed
          if (needsUpdate && !dryRun) {
            await Product.updateOne(
              { _id: product._id },
              { $set: updateData }
            );
            cleaned++;
            console.log(`✅ Cleaned product ${product.name} (${product._id})`);
          } else if (needsUpdate && dryRun) {
            cleaned++;
            console.log(`🔍 [DRY RUN] Would clean product ${product.name} (${product._id})`);
          }
        } catch (error) {
          errors.push({
            productId: product._id,
            productName: product.name,
            error: error.message,
          });
          console.error(`❌ Error processing product ${product._id}:`, error.message);
        }
      }

      processed += products.length;
      page++;
      console.log(`📈 Progress: ${processed}/${totalProducts} products processed`);
    }

    return {
      cleaned,
      broken,
      errors,
      totalProcessed: processed,
    };
  } catch (error) {
    console.error('Error cleaning broken images:', error);
    throw error;
  }
};

/**
 * Clean broken images for a specific product
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} { cleaned: boolean, broken: number }
 */
export const cleanBrokenImagesForProduct = async (productId) => {
  try {
    const product = await Product.findById(productId)
      .select('_id name image images imagePublicId imagesPublicIds')
      .lean();

    if (!product) {
      throw new Error('Product not found');
    }

    let needsUpdate = false;
    const updateData = {};
    let broken = 0;

    // Validate main image
    if (product.image) {
      const isValid = await validateImageUrl(product.image);
      if (!isValid) {
        updateData.image = null;
        updateData.imagePublicId = null;
        needsUpdate = true;
        broken++;
      }
    }

    // Validate gallery images
    if (product.images && product.images.length > 0) {
      const { valid, invalid } = await validateImageUrls(product.images);
      
      if (invalid.length > 0) {
        updateData.images = valid;
        
        if (product.imagesPublicIds && product.imagesPublicIds.length > 0) {
          const validPublicIds = product.images
            .map((url, index) => {
              if (valid.includes(url)) {
                return product.imagesPublicIds[index];
              }
              return null;
            })
            .filter(id => id !== null);
          
          updateData.imagesPublicIds = validPublicIds;
        } else {
          updateData.imagesPublicIds = [];
        }
        
        needsUpdate = true;
        broken += invalid.length;
      }
    }

    if (needsUpdate) {
      await Product.updateOne(
        { _id: productId },
        { $set: updateData }
      );
    }

    return {
      cleaned: needsUpdate,
      broken,
    };
  } catch (error) {
    throw error;
  }
};


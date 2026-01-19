import cloudinary from '../config/cloudinary.js';

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {String} folderName - Folder name in Cloudinary (e.g., 'categories', 'products')
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} { secure_url, public_id }
 */
export const uploadToCloudinary = async (buffer, folderName, options = {}) => {
  try {
    if (!buffer) {
      throw new Error('Buffer is required for upload');
    }

    // Check Cloudinary configuration
    const cloudinaryConfig = cloudinary.config();
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      console.error('[Cloudinary] Configuration missing:', {
        hasCloudName: !!cloudinaryConfig.cloud_name,
        hasApiKey: !!cloudinaryConfig.api_key,
        hasApiSecret: !!cloudinaryConfig.api_secret
      });
      throw new Error('Cloudinary is not properly configured. Please check environment variables.');
    }

    return new Promise((resolve, reject) => {
      try {
        // Ensure buffer is a Buffer object
        let fileBuffer;
        if (Buffer.isBuffer(buffer)) {
          fileBuffer = buffer;
        } else if (buffer instanceof Uint8Array) {
          fileBuffer = Buffer.from(buffer);
        } else if (typeof buffer === 'string') {
          fileBuffer = Buffer.from(buffer, 'base64');
        } else {
          fileBuffer = Buffer.from(buffer);
        }
        
        if (!fileBuffer || fileBuffer.length === 0) {
          reject(new Error('Invalid or empty buffer'));
          return;
        }

        const uploadOptions = {
          folder: folderName,
          resource_type: 'auto',
          timeout: 120000, // 2 minutes timeout for communication with Cloudinary
          ...options,
        };

        console.log('[Cloudinary] Starting upload:', {
          folder: folderName,
          bufferSize: fileBuffer.length,
          options: uploadOptions
        });

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('[Cloudinary] Upload callback error:', {
                message: error.message,
                http_code: error.http_code,
                name: error.name
              });
              reject(new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`));
            } else if (!result) {
              console.error('[Cloudinary] Upload returned null result');
              reject(new Error('Cloudinary upload returned no result'));
            } else {
              console.log('[Cloudinary] Upload successful:', {
                public_id: result.public_id,
                format: result.format,
                resource_type: result.resource_type,
                hasSecureUrl: !!result.secure_url
              });
              resolve({
                secure_url: result.secure_url,
                url: result.url,
                public_id: result.public_id,
                format: result.format,
                resource_type: result.resource_type,
              });
            }
          }
        );

        // Handle stream errors
        uploadStream.on('error', (streamError) => {
          console.error('[Cloudinary] Stream error event:', {
            message: streamError.message,
            code: streamError.code,
            name: streamError.name
          });
          reject(new Error(`Upload stream error: ${streamError.message || 'Unknown stream error'}`));
        });

        // Handle stream finish
        uploadStream.on('finish', () => {
          console.log('[Cloudinary] Stream finished');
        });

        // Write buffer to stream
        try {
          uploadStream.end(fileBuffer);
        } catch (writeError) {
          console.error('[Cloudinary] Error writing to stream:', writeError);
          reject(new Error(`Failed to write buffer to stream: ${writeError.message}`));
        }
      } catch (error) {
        console.error('[Cloudinary] Setup error:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        reject(new Error(`Failed to setup upload: ${error.message}`));
      }
    });
  } catch (error) {
    console.error('[Cloudinary] Outer catch error:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
};

/**
 * Upload base64 string to Cloudinary
 * @param {String} base64String - Base64 data URL (e.g., 'data:image/png;base64,...')
 * @param {String} folderName - Folder name in Cloudinary
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} { secure_url, public_id }
 */
export const uploadBase64ToCloudinary = async (base64String, folderName, options = {}) => {
  try {
    if (!base64String) {
      throw new Error('Base64 string is required for upload');
    }

    // Check if it's a base64 data URL
    if (!base64String.startsWith('data:')) {
      // If it's already a URL (Cloudinary or other), return as is
      if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
        return {
          secure_url: base64String,
          public_id: extractPublicIdFromUrl(base64String),
        };
      }
      throw new Error('Invalid base64 format. Expected data URL format (data:image/... or data:video/... or data:application/...)');
    }

    const uploadOptions = {
      folder: folderName,
      resource_type: 'auto',
      ...options,
    };

    const result = await cloudinary.uploader.upload(base64String, uploadOptions);

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    throw new Error(`Failed to upload base64 to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary by public_id
 * @param {String} publicId - Cloudinary public_id
 * @returns {Promise<Boolean>} Success status
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      return false; // No public_id to delete
    }

    // If public_id is a full URL, extract the public_id
    const extractedPublicId = extractPublicIdFromUrl(publicId) || publicId;

    const result = await cloudinary.uploader.destroy(extractedPublicId, {
      resource_type: 'image',
    });

    return result.result === 'ok';
  } catch (error) {
    // Log error but don't throw - deletion failures shouldn't break the flow
    console.error(`Failed to delete from Cloudinary (public_id: ${publicId}):`, error.message);
    return false;
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<String>} publicIds - Array of Cloudinary public_ids
 * @returns {Promise<Object>} { deleted: number, failed: number }
 */
export const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    const deletePromises = publicIds
      .filter(id => id) // Filter out null/undefined
      .map(publicId => {
        const extractedPublicId = extractPublicIdFromUrl(publicId) || publicId;
        return cloudinary.uploader.destroy(extractedPublicId, {
          resource_type: 'image',
        }).catch(error => {
          console.error(`Failed to delete ${extractedPublicId}:`, error.message);
          return { result: 'not found' };
        });
      });

    const results = await Promise.all(deletePromises);
    const deleted = results.filter(r => r.result === 'ok').length;
    const failed = results.length - deleted;

    return { deleted, failed };
  } catch (error) {
    console.error('Failed to delete multiple images from Cloudinary:', error.message);
    return { deleted: 0, failed: publicIds.length };
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String|null} public_id or null if not a Cloudinary URL
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Check if it's a Cloudinary URL
  const cloudinaryPattern = /cloudinary\.com\/.*\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mov|avi)/i;
  const match = url.match(cloudinaryPattern);

  if (match && match[1]) {
    // Remove folder prefix if present
    return match[1];
  }

  return null;
};

/**
 * Check if a string is a base64 data URL
 * @param {String} str - String to check
 * @returns {Boolean} True if base64 data URL
 */
export const isBase64DataUrl = (str) => {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return str.startsWith('data:image/') || str.startsWith('data:application/');
};


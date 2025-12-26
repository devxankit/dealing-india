import {
  getAllSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
} from '../../services/sliders.service.js';
import { upload } from '../../utils/upload.util.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../utils/cloudinary.util.js';

/**
 * Get all sliders
 * GET /api/admin/sliders
 */
export const getSliders = async (req, res, next) => {
  try {
    const sliders = await getAllSliders();

    res.status(200).json({
      success: true,
      message: 'Sliders retrieved successfully',
      data: { sliders },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get slider by ID
 * GET /api/admin/sliders/:id
 */
export const getSlider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slider = await getSliderById(id);

    res.status(200).json({
      success: true,
      message: 'Slider retrieved successfully',
      data: { slider },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create slider
 * POST /api/admin/sliders
 */
export const createSliderHandler = async (req, res, next) => {
  try {
    const { title, link, order, status } = req.body;
    let imageUrl = req.body.imageUrl || req.body.image;

    // Handle image upload if present
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'sliders'
        );
        imageUrl = uploadResult.secure_url;
        var imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    if (!title || !imageUrl || !link) {
      return res.status(400).json({
        success: false,
        message: 'Title, image, and link are required',
      });
    }

    const slider = await createSlider({
      title,
      imageUrl,
      imagePublicId: imagePublicId || null,
      link,
      order: order ? parseInt(order) : 0,
      status: status || 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      data: { slider },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update slider
 * PUT /api/admin/sliders/:id
 */
export const updateSliderHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get existing slider to check for old image
    const existingSlider = await getSliderById(id);

    // Handle image upload if present
    if (req.file) {
      try {
        // Upload new image to Cloudinary
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'sliders'
        );
        updateData.imageUrl = uploadResult.secure_url;
        updateData.imagePublicId = uploadResult.public_id;

        // Delete old image from Cloudinary if it exists
        if (existingSlider.imagePublicId) {
          await deleteFromCloudinary(existingSlider.imagePublicId);
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    } else if (updateData.image && !updateData.imageUrl) {
      updateData.imageUrl = updateData.image;
    }

    if (updateData.order) {
      updateData.order = parseInt(updateData.order);
    }

    const slider = await updateSlider(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Slider updated successfully',
      data: { slider },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete slider
 * DELETE /api/admin/sliders/:id
 */
export const deleteSliderHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get slider to check for image before deletion
    const slider = await getSliderById(id);

    // Delete slider (service handles validation)
    await deleteSlider(id);

    // Delete image from Cloudinary if it exists
    if (slider.imagePublicId) {
      await deleteFromCloudinary(slider.imagePublicId);
    }

    res.status(200).json({
      success: true,
      message: 'Slider deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


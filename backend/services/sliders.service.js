import Slider from '../models/Slider.model.js';

/**
 * Get all sliders
 */
export const getAllSliders = async () => {
  try {
    const sliders = await Slider.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return sliders.map((slider) => ({
      ...slider,
      id: slider._id.toString(),
      image: slider.imageUrl,
      imageUrl: slider.imageUrl, // Keep both for compatibility
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get slider by ID
 */
export const getSliderById = async (sliderId) => {
  try {
    const slider = await Slider.findById(sliderId).lean();

    if (!slider) {
      throw new Error('Slider not found');
    }

    return {
      ...slider,
      id: slider._id.toString(),
      image: slider.imageUrl,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid slider ID');
    }
    throw error;
  }
};

/**
 * Create slider
 */
export const createSlider = async (sliderData) => {
  try {
    const { title, imageUrl, link, order, status } = sliderData;

    const newSlider = new Slider({
      title,
      imageUrl,
      link,
      order: order || 0,
      status: status || 'active',
    });

    await newSlider.save();

    return {
      ...newSlider.toObject(),
      id: newSlider._id.toString(),
      image: newSlider.imageUrl,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update slider
 */
export const updateSlider = async (sliderId, updateData) => {
  try {
    const slider = await Slider.findByIdAndUpdate(
      sliderId,
      {
        ...updateData,
        imageUrl: updateData.imageUrl || updateData.image,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!slider) {
      throw new Error('Slider not found');
    }

    return {
      ...slider,
      id: slider._id.toString(),
      image: slider.imageUrl,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid slider ID');
    }
    throw error;
  }
};

/**
 * Delete slider
 */
export const deleteSlider = async (sliderId) => {
  try {
    const slider = await Slider.findByIdAndDelete(sliderId);
    if (!slider) {
      throw new Error('Slider not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid slider ID');
    }
    throw error;
  }
};


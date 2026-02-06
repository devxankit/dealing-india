import Banner from '../models/Banner.model.js';

/**
 * Sliders Service
 * Manages homepage sliders/banners
 */
export const getActiveSliders = async (location = 'home') => {
    return await Banner.find({ location, isActive: true }).sort({ order: 1 });
};

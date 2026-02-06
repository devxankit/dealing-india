import api from '../../../shared/utils/api';

/**
 * Get active banners for public display
 * @param {string} bannerType - 'hero' or 'b2b'
 */
export const getActiveBanners = async (bannerType = 'hero') => {
    const response = await api.get('/public/hero-banners', {
        params: { bannerType }
    });
    return response;
};

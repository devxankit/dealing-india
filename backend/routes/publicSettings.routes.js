import express from 'express';
import { getSettings } from '../services/settings.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

/**
 * Get public settings
 * GET /api/settings/public
 */
router.get('/public', redisService.cacheMiddleware('public:settings', 7200), asyncHandler(async (req, res) => {
    const settings = await getSettings();

    // Filter out sensitive settings
    const publicSettings = {
        general: settings.general,
        products: settings.products,
        tax: settings.tax,
        shipping: settings.shipping,
        features: settings.features,
        homepage: settings.homepage,
        reviews: settings.reviews,
        seo: settings.seo,
        notifications: settings.notifications,
    };

    res.status(200).json({
        success: true,
        message: 'Public settings retrieved successfully',
        data: { settings: publicSettings },
    });
}));

export default router;

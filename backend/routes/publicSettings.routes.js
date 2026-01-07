import express from 'express';
import { getSettings } from '../services/settings.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

/**
 * Get public settings
 * GET /api/settings/public
 */
router.get('/public', asyncHandler(async (req, res) => {
    const settings = await getSettings();

    // Filter out sensitive settings
    const publicSettings = {
        general: settings.general,
        products: settings.products,
        tax: settings.tax,
        shipping: settings.shipping,
        banners: settings.banners,
    };

    res.status(200).json({
        success: true,
        message: 'Public settings retrieved successfully',
        data: { settings: publicSettings },
    });
}));

export default router;

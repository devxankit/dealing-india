import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Customer Registration Analytics Controller - DISABLED (B2C REMOVAL)
 */

export const getCustomerRegistrationAnalytics = async (req, res) => {
    res.status(200).json({
        success: true,
        summary: { total: 0, today: 0, active: 0, inactive: 0 },
        data: { today: 0, weekly: 0, monthly: 0, yearly: 0 }
    });
};


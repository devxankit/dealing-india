import Vendor from '../models/Vendor.model.js';

/**
 * Track vendor contact clicks (call or whatsapp)
 * POST /api/vendor/analytics/track-click
 * 
 * Body: { vendorId, clickType: 'call' | 'whatsapp' }
 */
export const trackContactClick = async (req, res, next) => {
    try {
        const { vendorId, clickType } = req.body;

        if (!vendorId || !clickType) {
            return res.status(400).json({
                success: false,
                message: 'vendorId and clickType are required'
            });
        }

        if (!['call', 'whatsapp'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be either "call" or "whatsapp"'
            });
        }

        // Increment the appropriate counter
        const updateField = clickType === 'call'
            ? 'analytics.callClicks'
            : 'analytics.whatsappClicks';

        const updatedVendor = await Vendor.findByIdAndUpdate(
            vendorId,
            { $inc: { [updateField]: 1 } },
            { new: true }
        );

        if (!updatedVendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `${clickType} click tracked successfully`
        });
    } catch (error) {
        console.error('Error tracking click:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track click',
            error: error.message
        });
    }
};

/**
 * Get vendor analytics
 * GET /api/vendor/analytics
 */
export const getVendorAnalytics = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;

        const vendor = await Vendor.findById(vendorId).select('analytics').lean();

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                callClicks: vendor.analytics?.callClicks || 0,
                whatsappClicks: vendor.analytics?.whatsappClicks || 0
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};

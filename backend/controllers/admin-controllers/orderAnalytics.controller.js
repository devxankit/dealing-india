import * as orderAnalyticsService from '../../services/orderAnalytics.service.js';

/**
 * Get order analytics for charts
 * GET /api/admin/reports/order-analytics
 */
export const getOrderAnalytics = async (req, res, next) => {
    try {
        const { date, type } = req.query;

        let data;
        const targetDate = date ? new Date(date) : new Date();

        if (type === 'today') {
            data = await orderAnalyticsService.getTodayOrdersAnalytics(targetDate);
        } else if (type === 'weekly') {
            data = await orderAnalyticsService.getWeeklyOrdersAnalytics();
        } else if (type === 'monthly') {
            data = await orderAnalyticsService.getMonthlyOrdersAnalytics();
        } else if (type === 'yearly') {
            data = await orderAnalyticsService.getYearlyOrdersAnalytics();
        } else {
            // Return all if no type specified
            data = {
                today: await orderAnalyticsService.getTodayOrdersAnalytics(targetDate),
                week: await orderAnalyticsService.getWeeklyOrdersAnalytics(),
                month: await orderAnalyticsService.getMonthlyOrdersAnalytics(),
                year: await orderAnalyticsService.getYearlyOrdersAnalytics()
            };
        }

        res.status(200).json({
            success: true,
            message: 'Order analytics retrieved successfully',
            data
        });
    } catch (error) {
        next(error);
    }
};

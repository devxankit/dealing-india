import * as customerAnalyticsService from '../../services/customerRegistrationAnalytics.service.js';

/**
 * Get customer registration analytics for admin charts
 */
export const getCustomerRegistrationAnalytics = async (req, res) => {
    try {
        const { type, date, startDate, endDate } = req.query;
        let data;

        // Base metrics always returned in primary request if no type specified
        const summary = await customerAnalyticsService.getCustomerSummaryStats();

        if (type === 'today') {
            const targetDate = date ? new Date(date) : new Date();
            data = await customerAnalyticsService.getTodayRegistrations(targetDate);
        } else if (type === 'weekly') {
            data = await customerAnalyticsService.getWeeklyRegistrations();
        } else if (type === 'monthly') {
            data = await customerAnalyticsService.getMonthlyRegistrations();
        } else if (type === 'yearly') {
            data = await customerAnalyticsService.getYearlyRegistrations();
        } else if (type === 'custom' && startDate && endDate) {
            data = await customerAnalyticsService.getCustomRangeRegistrations(startDate, endDate);
        } else if (type === 'details' && date) {
            data = await customerAnalyticsService.getCustomersRegisteredOnDate(date);
        } else {
            // Default: Fetch all for dashboard initialization
            const [today, weekly, monthly, yearly] = await Promise.all([
                customerAnalyticsService.getTodayRegistrations(new Date()),
                customerAnalyticsService.getWeeklyRegistrations(),
                customerAnalyticsService.getMonthlyRegistrations(),
                customerAnalyticsService.getYearlyRegistrations()
            ]);
            data = { today, weekly, monthly, yearly };
        }

        res.status(200).json({
            success: true,
            summary,
            data
        });
    } catch (error) {
        console.error('Error fetching customer registration analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer registration analytics'
        });
    }
};

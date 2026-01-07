import Vendor from '../models/Vendor.model.js';

/**
 * Get vendor summary statistics
 */
export const getVendorSummaryStats = async () => {
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ isActive: true });
    const inactiveVendors = await Vendor.countDocuments({ isActive: false });
    const statusBreakdown = await Vendor.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCounts = {
        pending: 0,
        approved: 0,
        rejected: 0
    };

    statusBreakdown.forEach(item => {
        if (statusCounts.hasOwnProperty(item._id)) {
            statusCounts[item._id] = item.count;
        }
    });

    // Average vendor age in days
    const averageAgeResult = await Vendor.aggregate([
        {
            $group: {
                _id: null,
                avgAge: {
                    $avg: {
                        $dateDiff: {
                            startDate: '$createdAt',
                            endDate: new Date(),
                            unit: 'day'
                        }
                    }
                }
            }
        }
    ]);

    const avgAge = averageAgeResult.length > 0 ? Math.round(averageAgeResult[0].avgAge) : 0;

    return {
        totalVendors,
        activeVendors,
        inactiveVendors,
        ...statusCounts,
        avgAge
    };
};

/**
 * Get vendor registration analytics for a specific date (hourly)
 * @param {Date} date 
 */
export const getTodayRegistrations = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await Vendor.aggregate([
        {
            $match: {
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        {
            $group: {
                _id: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Fill in gaps for all 24 hours
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hourData = stats.find(s => s._id === i);
        return {
            label: `${i}:00`,
            count: hourData ? hourData.count : 0
        };
    });

    return hourlyData;
};

/**
 * Get weekly registration analytics (last 7 days)
 */
export const getWeeklyRegistrations = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Vendor.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const dailyData = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = stats.find(s => s._id === dateStr);
        dailyData.push({
            label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            count: dayData ? dayData.count : 0
        });
    }

    return dailyData;
};

/**
 * Get monthly registration analytics (last 30 days)
 */
export const getMonthlyRegistrations = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Vendor.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const dailyData = [];
    for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = stats.find(s => s._id === dateStr);
        dailyData.push({
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: dayData ? dayData.count : 0
        });
    }

    return dailyData;
};

/**
 * Get yearly registration analytics (last 12 months)
 */
export const getYearlyRegistrations = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Vendor.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        const dateStr = d.toISOString().substring(0, 7);
        const monthData = stats.find(s => s._id === dateStr);
        monthlyData.push({
            label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            count: monthData ? monthData.count : 0
        });
    }

    return monthlyData;
};

/**
 * Get custom date range registration analytics
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const getCustomRangeRegistrations = async (startDate, endDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Calculate number of days
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const stats = await Vendor.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const dailyData = [];
    for (let i = 0; i <= daysDiff; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = stats.find(s => s._id === dateStr);
        dailyData.push({
            date: dateStr,
            label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            count: dayData ? dayData.count : 0
        });
    }

    return dailyData;
};

/**
 * Get detailed vendor list for a specific date
 * @param {Date} date
 */
export const getVendorsRegisteredOnDate = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const vendors = await Vendor.find(
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { name: 1, email: 1, storeName: 1, status: 1, isActive: 1, createdAt: 1 }
    ).sort({ createdAt: -1 });

    return vendors.map(v => ({
        id: v._id,
        name: v.name,
        email: v.email,
        storeName: v.storeName,
        status: v.status,
        isActive: v.isActive,
        registeredAt: v.createdAt
    }));
};

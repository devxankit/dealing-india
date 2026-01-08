import User from '../models/User.model.js';

/**
 * Get customer summary statistics
 */
export const getCustomerSummaryStats = async () => {
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const blockedCustomers = await User.countDocuments({ role: 'user', isActive: false });

    return {
        totalCustomers,
        blockedCustomers
    };
};

/**
 * Get customer registration analytics for a specific date (hourly)
 * @param {Date} date 
 */
export const getTodayRegistrations = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await User.aggregate([
        {
            $match: {
                role: 'user',
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%H', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hourStr = String(i).padStart(2, '0');
        const hourData = stats.find(s => s._id === hourStr);
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

    const stats = await User.aggregate([
        {
            $match: {
                role: 'user',
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const dailyData = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
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

    const stats = await User.aggregate([
        {
            $match: {
                role: 'user',
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const dailyData = [];
    for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
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

    const stats = await User.aggregate([
        {
            $match: {
                role: 'user',
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateStr = `${year}-${month}`;
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
 */
export const getCustomRangeRegistrations = async (startDate, endDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const stats = await User.aggregate([
        {
            $match: {
                role: 'user',
                createdAt: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const dailyData = [];
    for (let i = 0; i <= daysDiff; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
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
 * Get customers registered on a specific date
 */
export const getCustomersRegisteredOnDate = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await User.find({
        role: 'user',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).select('name email phone isActive createdAt').lean();
};

import mongoose from 'mongoose';
import Order from '../models/Order.model.js';

/**
 * Get order analytics for a specific date (hourly)
 * @param {Date} date 
 */
export const getTodayOrdersAnalytics = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await Order.aggregate([
        {
            $match: {
                orderDate: { $gte: startOfDay, $lte: endOfDay },
                status: { $nin: ['cancelled', 'refunded'] }
            }
        },
        {
            $group: {
                _id: { $hour: '$orderDate' },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Fill in the gaps for all 24 hours
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hourData = stats.find(s => s._id === i);
        return {
            label: `${i}:00`,
            orders: hourData ? hourData.orders : 0,
            revenue: hourData ? hourData.revenue : 0
        };
    });

    return hourlyData;
};

/**
 * Get weekly order analytics (last 7 days)
 */
export const getWeeklyOrdersAnalytics = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
        {
            $match: {
                orderDate: { $gte: startDate, $lte: endDate },
                status: { $nin: ['cancelled', 'refunded'] }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Fill the gaps for 7 days
    const dailyData = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = stats.find(s => s._id === dateStr);
        dailyData.push({
            label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            orders: dayData ? dayData.orders : 0,
            revenue: dayData ? dayData.revenue : 0
        });
    }

    return dailyData;
};

/**
 * Get monthly order analytics (last 30 days)
 */
export const getMonthlyOrdersAnalytics = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
        {
            $match: {
                orderDate: { $gte: startDate, $lte: endDate },
                status: { $nin: ['cancelled', 'refunded'] }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
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
            orders: dayData ? dayData.orders : 0,
            revenue: dayData ? dayData.revenue : 0
        });
    }

    return dailyData;
};

/**
 * Get yearly order analytics (last 12 months)
 */
export const getYearlyOrdersAnalytics = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
        {
            $match: {
                orderDate: { $gte: startDate, $lte: endDate },
                status: { $nin: ['cancelled', 'refunded'] }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
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
            orders: monthData ? monthData.orders : 0,
            revenue: monthData ? monthData.revenue : 0
        });
    }

    return monthlyData;
};

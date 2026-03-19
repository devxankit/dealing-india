import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Property from '../models/Property.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Transaction from '../models/Transaction.model.js';
import B2BCategory from '../models/B2BCategory.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import LotSlot from '../models/LotSlot.model.js';

/**
 * Get Admin Dashboard Summary
 * @route GET /api/admin/reports/dashboard-summary
 * @access Private/Admin
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
    // Fetch all active categories defined by Admin first
    const activeCategories = await B2BCategory.find({ isActive: true }).select('name').lean();
    const categoryNames = activeCategories.map(c => c.name);

    // Optimize: Fetch ALL counts, aggregations, and revenue stats in a single parallel block for maximum performance
    const [
        totalCustomers,
        totalVendors,
        totalProducts,
        totalProperties,
        activeBanners,
        recentVendors,
        activeVendors,
        activeProducts,
        activeProperties,
        vendorDistribution,
        topCategoriesRaw,
        topLocationsRaw,
        revenueResult,
        activeSubscriptionsCount,
        totalLotSlots,
        activeLotSlots
    ] = await Promise.all([
        User.countDocuments(),
        Vendor.countDocuments({ vendorType: { $ne: 'admin' } }),
        Product.countDocuments(),
        Property.countDocuments(),
        BannerBooking.countDocuments({
            status: 'active',
            paymentStatus: 'paid',
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        }),
        Vendor.find({ vendorType: { $ne: 'admin' } })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email storeName createdAt status vendorType phone')
            .lean(),
        Vendor.countDocuments({ vendorType: { $ne: 'admin' }, status: 'approved' }),
        Product.countDocuments({ isActive: true }),
        Property.countDocuments({ isActive: true }),
        Vendor.aggregate([
            { $match: { vendorType: { $ne: 'admin' } } },
            { $group: { _id: '$vendorType', count: { $sum: 1 } } }
        ]),
        // Top categories based on Admin defined categories
        Product.aggregate([
            {
                $match: {
                    isActive: true, // Only count active products
                    category: { $in: categoryNames } // Use indexed field
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),
        // Top 5 Property Locations
        Property.aggregate([
            {
                $group: {
                    _id: { $ifNull: ['$location.city', 'Unknown'] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),
        // Real revenue calculation from Transactions
        Transaction.aggregate([
            { $match: { status: 'completed', type: 'payment' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        VendorSubscription.countDocuments({ status: 'active' }),
        LotSlot.countDocuments(),
        LotSlot.countDocuments({ isActive: true })
    ]);

    // Format vendor distribution for frontend
    const formattedVendorDistribution = vendorDistribution.map(v => ({
        name: v._id === 'b2b' ? 'B2B Vendors' : 'Individual Sellers',
        value: v.count,
        color: v._id === 'b2b' ? '#3B82F6' : '#10B981' // Blue for B2B, Green for others
    }));

    // Create a map of aggregation results
    const countsMap = topCategoriesRaw.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    // Ensure all admin categories are represented, even with 0 products
    const topCategories = categoryNames.map(name => ({
        name: name,
        views: countsMap[name] || 0
    })).sort((a, b) => b.views - a.views).slice(0, 10);

    // Format top locations
    const topLocations = topLocationsRaw.map(l => ({
        name: l._id,
        views: l.count
    }));

    // Real revenue calculation (from Transactions + Subscriptions)
    const transactionRevenue = revenueResult[0]?.total || 0;
    
    // Calculate Subscription Revenue from Audit Logs
    const subscriptionRevenueResult = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
            $match: {
                'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
                'auditLogs.details.status': 'completed'
            }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
    ]);
    const totalSubscriptionRevenue = subscriptionRevenueResult[0]?.total || 0;

    const totalRevenue = transactionRevenue + totalSubscriptionRevenue;

    // Dynamic Revenue Data (Last 6 Months) from VendorSubscription Audit Logs
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); 
    sixMonthsAgo.setDate(1); 

    const revenueAggregation = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
            $match: {
                'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
                'auditLogs.details.status': 'completed',
                'auditLogs.timestamp': { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: '$auditLogs.timestamp' },
                    year: { $year: '$auditLogs.timestamp' }
                },
                totalRevenue: { $sum: '$auditLogs.details.amount' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format revenue data for the chart (ensure all 6 months are present)
    const revenueData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthIndex = d.getMonth();
        const year = d.getFullYear();

        const foundData = revenueAggregation.find(r => r._id.month === (monthIndex + 1) && r._id.year === year);

        revenueData.push({
            name: monthNames[monthIndex],
            revenue: foundData ? foundData.totalRevenue : 0,
            fullDate: `${monthNames[monthIndex]} ${year}`
        });
    }

    // Combined Payment History (Transactions + Subscriptions)
    const [recentTransactions, recentSubs] = await Promise.all([
        Transaction.find({ status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('customerId', 'name email phone')
            .lean(),
        VendorSubscription.find({ 'auditLogs.action': 'subscription_payment' })
            .sort({ updatedAt: -1 })
            .limit(10)
            .populate('vendorId', 'name email phone')
            .populate('planId', 'name')
            .lean()
    ]);

    const combinedHistory = [
        ...recentTransactions.map(t => ({
            id: t._id,
            amount: t.amount,
            type: 'Order/Banner',
            method: t.method,
            date: t.transactionDate || t.createdAt,
            status: t.status,
            user: t.customerId?.name || 'N/A',
            userEmail: t.customerId?.email
        })),
        ...recentSubs.map(s => ({
            id: s._id,
            amount: s.auditLogs.find(l => l.action === 'subscription_payment')?.details?.amount || 0,
            type: `Subscription (${s.planId?.name || 'Plan'})`,
            method: s.paymentMethod,
            date: s.updatedAt,
            status: s.status,
            user: s.vendorId?.name || 'Vendor',
            userEmail: s.vendorId?.email
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

    res.status(200).json({
        success: true,
        data: {
            summary: {
                totalCustomers,
                totalVendors,
                totalProducts,
                totalProperties,
                activeBanners,
                activeVendors,
                activeProducts,
                activeProperties,
                totalRevenue,
                activeSubscriptionsCount,
                totalLotSlots,
                activeLotSlots
            },
            vendorDistribution: formattedVendorDistribution,
            recentVendors,
            paymentHistory: combinedHistory,
            performance: {
                topCategories: topCategories.length ? topCategories : [{ name: 'No Product Added Yet', views: 0 }],
                topLocations: topLocations.length ? topLocations : [{ name: 'No Data', views: 0 }]
            },
            revenueData: revenueData
        }
    });
});

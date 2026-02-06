import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Transaction from '../models/Transaction.model.js';

/**
 * Get Admin Dashboard Summary
 * @route GET /api/admin/reports/dashboard-summary
 * @access Private/Admin
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setMonth(now.getMonth() - 1);
    }

    // Parallel fetch counts
    const [
        totalCustomers,
        totalVendors,
        totalProducts,
        recentVendors,
        revenueResult
    ] = await Promise.all([
        User.countDocuments(),
        Vendor.countDocuments(),
        Product.countDocuments(),
        Vendor.find().sort({ createdAt: -1 }).limit(5).select('name email storeName createdAt status'),
        Transaction.aggregate([
            { $match: { status: 'success' } }, // Adjust based on your Transaction model status
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Mock data for charts (since Order model is missing or structured differently)
    const revenueData = [
        { name: 'Jan', revenue: 4000 },
        { name: 'Feb', revenue: 3000 },
        { name: 'Mar', revenue: 2000 },
        { name: 'Apr', revenue: 2780 },
        { name: 'May', revenue: 1890 },
        { name: 'Jun', revenue: 2390 },
    ];

    const salesData = [
        { name: 'Jan', sales: 2400 },
        { name: 'Feb', sales: 1398 },
        { name: 'Mar', sales: 9800 },
        { name: 'Apr', sales: 3908 },
        { name: 'May', sales: 4800 },
        { name: 'Jun', sales: 3800 },
    ];

    const customerGrowth = [
        { name: 'Jan', customers: 100 },
        { name: 'Feb', customers: 120 },
        { name: 'Mar', customers: 150 },
        { name: 'Apr', customers: 180 },
        { name: 'May', customers: 220 },
        { name: 'Jun', customers: 280 },
    ];

    res.status(200).json({
        success: true,
        data: {
            summary: {
                totalRevenue,
                totalOrders: 0, // Mocked as Order model is missing
                totalProducts,
                totalCustomers,
                totalVendors
            },
            revenueData,
            salesData,
            customerGrowth,
            recentOrders: [], // Mocked
            topProducts: [], // Mocked
            recentVendors
        }
    });
});

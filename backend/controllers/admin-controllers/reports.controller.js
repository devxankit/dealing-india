export const getDashboardSummary = async (req, res) => {
    try {
        // Stubbed response for Admin Dashboard to resolve 404
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    avgOrderValue: 0
                },
                revenueData: [],
                topProducts: [],
                orderStatus: [],
                recentOrders: [],
                statsCards: {
                    revenue: { value: 0, change: 0 },
                    orders: { value: 0, change: 0 },
                    customers: { value: 0, change: 0 },
                    products: { value: 0, change: 0 }
                }
            }
        });
    } catch (error) {
        console.error('Error in getDashboardSummary:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

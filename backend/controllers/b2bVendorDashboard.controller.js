import Product from '../models/Product.model.js';
import Property from '../models/Property.model.js';
import LotSlot from '../models/LotSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Notification from '../models/Notification.model.js';

/**
 * Get B2B Vendor Dashboard Data
 * GET /api/vendor/dashboard
 */
export const getDashboardData = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;

        // 1. Get List Statistics (Counts)


        // Wait, let's simplify and use multiple queries for clarity and reliability
        const [
            totalProducts, approvedProducts,
            totalProperties, approvedProperties,
            totalLotSlots, approvedLotSlots,
            activeBanners,
            subscriptions,
            notifications
        ] = await Promise.all([
            Product.countDocuments({ vendorId }),
            Product.countDocuments({ vendorId, isActive: true }),
            Property.countDocuments({ vendorId }),
            Property.countDocuments({ vendorId, isActive: true }),
            LotSlot.countDocuments({ vendorId }),
            LotSlot.countDocuments({ vendorId, isActive: true }),
            BannerBooking.find({ vendorId, status: 'active' }).populate('slotId').lean(),
            VendorSubscription.find({ vendorId, status: 'active' }).populate('planId').lean(),
            Notification.find({ recipient: vendorId, recipientType: 'vendor' }).sort({ createdAt: -1 }).limit(5).lean()
        ]);

        // Format Data for Frontend
        const dashboardData = {
            overview: {
                bannerClicks: 0, // Not yet tracked in backend
                callClicks: 0,   // Not yet tracked in backend
                whatsappClicks: 0 // Not yet tracked in backend
            },
            counts: {
                products: {
                    total: totalProducts,
                    approved: approvedProducts,
                    pending: totalProducts - approvedProducts
                },
                properties: {
                    total: totalProperties,
                    approved: approvedProperties,
                    pending: totalProperties - approvedProperties
                },
                lotSlot: {
                    total: totalLotSlots,
                    approved: approvedLotSlots,
                    pending: totalLotSlots - approvedLotSlots
                }
            },
            subscriptions: subscriptions.map(sub => ({
                type: sub.planId?.businessType || 'unknown',
                name: sub.planId?.name || 'Active Plan',
                status: sub.status === 'active' ? 'Active' : 'Expiring Soon',
                expiry: sub.endDate,
                daysLeft: Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
            })),
            banners: activeBanners.map(b => ({
                title: b.title || 'Active Banner',
                type: b.slotId?.name || 'Banner',
                expiry: b.endDate
            })),
            alerts: notifications.map(n => ({
                id: n._id,
                type: n.priority === 'high' ? 'warning' : 'info',
                message: n.message
            }))
        };

        // Add expiry alerts if not in notifications
        if (dashboardData.subscriptions.length > 0) {
            dashboardData.subscriptions.forEach(sub => {
                if (sub.daysLeft <= 7) {
                    dashboardData.alerts.push({
                        id: `expiry-${sub.type}`,
                        type: 'warning',
                        message: `Your "${sub.name}" plan is expiring in ${sub.daysLeft} days.`
                    });
                }
            });
        }

        res.status(200).json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error fetching vendor dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
};

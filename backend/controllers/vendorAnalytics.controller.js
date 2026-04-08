import Vendor from '../models/Vendor.model.js';
import notificationService from '../services/notification.service.js';
import VendorContactClick from '../models/VendorContactClick.model.js';
import mongoose from 'mongoose';

const getIndiaDateKey = (date = new Date()) => {
    // YYYY-MM-DD in Asia/Kolkata
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    } catch {
        // Fallback: server local date (still stable)
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
};

/**
 * Track vendor contact clicks (call, whatsapp or map)
 * POST /api/vendor/analytics/track-click
 *
 * Body: { vendorId, clickType: 'call' | 'whatsapp' | 'map', itemType?, itemId? }
 */
export const trackContactClick = async (req, res, next) => {
    try {
        const { vendorId, clickType, itemType, itemId, category } = req.body;

        if (!vendorId || !clickType) {
            return res.status(400).json({
                success: false,
                message: 'vendorId and clickType are required'
            });
        }

        if (!['call', 'whatsapp', 'map'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be one of "call", "whatsapp" or "map"'
            });
        }

        // Increment the appropriate counter
        const updateField =
            clickType === 'call'
                ? 'analytics.callClicks'
                : clickType === 'whatsapp'
                    ? 'analytics.whatsappClicks'
                    : 'analytics.mapClicks';

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

        try {
            // Store per-user-per-day click records (for vendor visibility)
            const dateKey = getIndiaDateKey(new Date());
            const safeItemType = ['product', 'lotslot', 'property', 'vendor', 'reel'].includes(itemType)
                ? itemType
                : 'unknown';

            await VendorContactClick.create({
                vendorId,
                clickType,
                userId: req.user ? (req.user.id || req.user.vendorId || req.user.adminId) : null,
                userRole: req.user ? req.user.role : null,
                dateKey,
                itemType: safeItemType,
                itemId: itemId || null,
                category: category || null,
            });
        } catch (e) {
            // Non-blocking: analytics storage should never fail the click action
            console.error('VendorContactClick create error:', e?.message || e);
        }

        // Backend side notification for the user who clicked (if logged in)
        if (req.user && req.user.role === 'user') {
            const userId = req.user.id;
            notificationService.createNotification({
                recipientId: userId,
                recipientType: 'user',
                type: 'system',
                title: 'Contact Request Logged 📞',
                message: `You recently tried to contact "${updatedVendor.storeName}" via ${clickType}. Don't forget to follow up for the best quotes!`,
                actionUrl: `/b2b/vendor/${vendorId}`
            }).catch(e => console.error('Notification Error:', e.message));
        }
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
 * Get unique users who clicked contact buttons (dedup by user+date)
 * GET /api/vendor/analytics/click-users?clickType=call|whatsapp|map&page&limit&dateFrom&dateTo
 * (Vendor auth)
 */
export const getClickUsers = async (req, res, next) => {
    try {
        const vendorId = req.user.vendorId;
        const {
            clickType,
            page = 1,
            limit = 50,
            dateFrom,
            dateTo
        } = req.query;

        if (!['call', 'whatsapp', 'map'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be one of "call", "whatsapp" or "map"'
            });
        }

        const numericPage = Math.max(1, parseInt(page, 10) || 1);
        const numericLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (numericPage - 1) * numericLimit;

        const match = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            clickType,
        };

        const fromKey = dateFrom ? String(dateFrom).trim() : null;
        const toKey = dateTo ? String(dateTo).trim() : null;
        if (fromKey || toKey) {
            match.dateKey = {};
            if (fromKey) match.dateKey.$gte = fromKey;
            if (toKey) match.dateKey.$lte = toKey;
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' },
                    clickCount: { $sum: 1 },
                    lastClickAt: { $max: '$createdAt' },
                    itemType: { $first: '$itemType' },
                }
            },
            { $sort: { '_id.dateKey': -1, lastClickAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'vData'
                }
            },
            { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$vData', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    matchedUser: { $ifNull: ['$userData', '$vData'] }
                }
            },
            {
                $project: {
                    _id: 0,
                    dateKey: '$_id.dateKey',
                    category: '$_id.category',
                    clickCount: 1,
                    lastClickAt: 1,
                    user: {
                        _id: '$matchedUser._id',
                        name: { $ifNull: ['$matchedUser.name', 'Anonymous Visitor'] },
                        email: { $ifNull: ['$matchedUser.email', 'N/A'] },
                        phone: { $ifNull: ['$matchedUser.phone', 'N/A'] },
                    },
                    itemType: 1,
                }
            },
            { $skip: skip },
            { $limit: numericLimit },
        ];

        const countPipeline = [
            { $match: match },
            { $group: { _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' } } },
            { $count: 'total' }
        ];

        const [items, countRes] = await Promise.all([
            VendorContactClick.aggregate(pipeline),
            VendorContactClick.aggregate(countPipeline),
        ]);

        const total = countRes?.[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page: numericPage,
                    limit: numericLimit,
                    total,
                    totalPages: Math.ceil(total / numericLimit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching click users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch click users',
            error: error.message
        });
    }
};

/**
 * Admin: Get unique users who clicked contact buttons for a specific vendor
 * GET /api/admin/analytics/vendor-contact/:vendorId/click-users?clickType=call|whatsapp|map&page&limit&dateFrom&dateTo
 * (Admin auth)
 */
export const getClickUsersForVendorAdmin = async (req, res, next) => {
    try {
        const { vendorId } = req.params;
        const {
            clickType,
            page = 1,
            limit = 50,
            dateFrom,
            dateTo
        } = req.query;

        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vendorId'
            });
        }

        if (!['call', 'whatsapp', 'map'].includes(clickType)) {
            return res.status(400).json({
                success: false,
                message: 'clickType must be one of "call", "whatsapp" or "map"'
            });
        }

        const numericPage = Math.max(1, parseInt(page, 10) || 1);
        const numericLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (numericPage - 1) * numericLimit;

        const match = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            clickType,
        };

        const fromKey = dateFrom ? String(dateFrom).trim() : null;
        const toKey = dateTo ? String(dateTo).trim() : null;
        if (fromKey || toKey) {
            match.dateKey = {};
            if (fromKey) match.dateKey.$gte = fromKey;
            if (toKey) match.dateKey.$lte = toKey;
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' },
                    clickCount: { $sum: 1 },
                    lastClickAt: { $max: '$createdAt' },
                    itemType: { $first: '$itemType' },
                }
            },
            { $sort: { '_id.dateKey': -1, lastClickAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'vData'
                }
            },
            { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$vData', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    matchedUser: { $ifNull: ['$userData', '$vData'] }
                }
            },
            {
                $project: {
                    _id: 0,
                    dateKey: '$_id.dateKey',
                    category: '$_id.category',
                    clickCount: 1,
                    lastClickAt: 1,
                    user: {
                        _id: '$matchedUser._id',
                        name: { $ifNull: ['$matchedUser.name', 'Anonymous Visitor'] },
                        email: { $ifNull: ['$matchedUser.email', 'N/A'] },
                        phone: { $ifNull: ['$matchedUser.phone', 'N/A'] },
                    },
                    itemType: 1,
                }
            },
            { $skip: skip },
            { $limit: numericLimit },
        ];

        const countPipeline = [
            { $match: match },
            { $group: { _id: { userId: '$userId', dateKey: '$dateKey', category: '$category' } } },
            { $count: 'total' }
        ];

        const [items, countRes] = await Promise.all([
            VendorContactClick.aggregate(pipeline),
            VendorContactClick.aggregate(countPipeline),
        ]);

        const total = countRes?.[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page: numericPage,
                    limit: numericLimit,
                    total,
                    totalPages: Math.ceil(total / numericLimit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching click users for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch click users',
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
                whatsappClicks: vendor.analytics?.whatsappClicks || 0,
                mapClicks: vendor.analytics?.mapClicks || 0
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

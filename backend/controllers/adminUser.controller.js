import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import User from '../models/User.model.js';

/**
 * Get paginated list of registered users
 * @route GET /api/admin/users
 * @access Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search = '',
        isActive,
        isEmailVerified
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};

    if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { name: regex },
            { email: regex },
            { phone: regex },
            { 'businessInfo.companyName': regex }
        ];
    }

    if (typeof isActive !== 'undefined') {
        if (isActive === 'true' || isActive === 'false') {
            filter.isActive = isActive === 'true';
        }
    }

    if (typeof isEmailVerified !== 'undefined') {
        if (isEmailVerified === 'true' || isEmailVerified === 'false') {
            filter.isEmailVerified = isEmailVerified === 'true';
        }
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .select('-password')
            .lean(),
        User.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        data: users,
        meta: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1
        }
    });
});


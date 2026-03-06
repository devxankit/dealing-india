import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import {
    getReferralSummaryForAuthUser,
    transferUserPointsToVendor,
    validateReferralCode,
} from '../services/referral.service.js';

export const getMyReferralSummary = asyncHandler(async (req, res) => {
    const data = await getReferralSummaryForAuthUser(req.user);
    res.status(200).json({
        success: true,
        data,
    });
});

export const validateReferralCodePublic = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const referral = await validateReferralCode(code);

    if (!referral) {
        return res.status(404).json({
            success: false,
            message: 'Referral code not found',
        });
    }

    return res.status(200).json({
        success: true,
        data: {
            referralCode: referral.referralCode,
            referrerType: referral.userModel,
        },
    });
});

export const transferPointsToVendor = asyncHandler(async (req, res) => {
    if (req.user?.role !== 'user') {
        return res.status(403).json({
            success: false,
            message: 'Only users can transfer points to vendors',
        });
    }

    const { vendorId, points } = req.body;
    const result = await transferUserPointsToVendor({
        userId: req.user.id,
        vendorId,
        points,
    });

    res.status(200).json({
        success: true,
        message: 'Points transferred successfully',
        data: result,
    });
});

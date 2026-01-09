import PromotionalReel from '../../models/PromotionalReel.model.js';
import Reel from '../../models/Reel.model.js';
import mongoose from 'mongoose';

/**
 * Get single reel by ID (works for both standard and promotional reels)
 * GET /api/public/reels/:id
 */
export const getReelById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reel ID'
            });
        }

        // 1. Try finding in Promotional Reels
        const reel = await PromotionalReel.findById(id)
            .populate('uploadedBy', 'name logo')
            .lean();

        if (reel) {
            // Map promotional reel fields to consistent format
            return res.status(200).json({
                success: true,
                message: 'Promotional reel retrieved successfully',
                data: {
                    ...reel,
                    id: reel._id,
                    isPromotional: true,
                    vendorName: reel.uploadedBy?.name || 'Dealing India',
                    vendorLogo: reel.uploadedBy?.logo,
                }
            });
        }

        // 2. Not found
        return res.status(404).json({
            success: false,
            message: 'Promotional reel not found'
        });

    } catch (error) {
        next(error);
    }
};

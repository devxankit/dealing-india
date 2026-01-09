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
                    // Use consistent brand identity for all promotional reels
                    vendorName: 'Dealing India',
                    vendorLogo: null, // Triggers initials-based avatar on frontend
                }
            });
        }

        // 2. Try finding in Standard Reels
        const standardReel = await Reel.findById(id)
            .populate('vendorId', 'name storeLogo storeName')
            .populate('productId', 'name price thumbnail description')
            .lean();

        if (standardReel) {
            return res.status(200).json({
                success: true,
                message: 'Standard reel retrieved successfully',
                data: {
                    ...standardReel,
                    id: standardReel._id,
                    isPromotional: false,
                    vendorName: standardReel.vendorId?.storeName || standardReel.vendorId?.name || 'Vendor',
                    vendorLogo: standardReel.vendorId?.storeLogo,
                    productName: standardReel.productId?.name,
                    productPrice: standardReel.productId?.price,
                    description: standardReel.productId?.description || '',
                    thumbnail: standardReel.thumbnail || standardReel.productId?.thumbnail
                }
            });
        }

        // 3. Not found
        return res.status(404).json({
            success: false,
            message: 'Reel not found'
        });

    } catch (error) {
        next(error);
    }
};

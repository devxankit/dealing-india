import PromotionalReelService from '../../services/promotionalReel.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import redisService from '../../services/redis.service.js';

/**
 * Helper to clear reel-related cache
 */
const clearReelCache = async (reelId = null) => {
    try {
        const patterns = [
            'reels:feed:*',
            'promotional-reels:list:*',
            'promotional-reels:liked:*'
        ];
        
        if (reelId) {
            patterns.push(`reel:details:*${reelId}*`);
            patterns.push(`promotional-reels:comments:*${reelId}*`);
        } else {
            patterns.push('reel:details:*');
            patterns.push('promotional-reels:comments:*');
        }
        
        await Promise.all(patterns.map(pattern => redisService.clearPattern(pattern)));
    } catch (error) {
        console.error('Error clearing reel cache:', error);
    }
};

export const createReel = asyncHandler(async (req, res) => {
    // Handle file uploads if present
    const videoFile = req.files?.video ? req.files.video[0] : null;
    const thumbnailFile = req.files?.thumbnail ? req.files.thumbnail[0] : null;

    // Use adminId from token or _id if available
    const adminId = req.user.adminId || req.user._id;

    const reel = await PromotionalReelService.createReel(req.body, videoFile, thumbnailFile, adminId);
    
    // Clear reel cache
    await clearReelCache();

    res.status(201).json({ success: true, count: 1, data: reel });
});


export const getReels = asyncHandler(async (req, res) => {
    const reels = await PromotionalReelService.getAllReels(req.query);
    res.status(200).json({ success: true, count: reels.length, data: reels });
});

export const deleteReel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await PromotionalReelService.deleteReel(id);
    
    // Clear reel cache
    await clearReelCache(id);

    res.status(200).json({ success: true, message: 'Promotional Reel deleted' });
});

export const updateReel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const reel = await PromotionalReelService.updateReel(id, req.body);
    
    // Clear reel cache
    await clearReelCache(id);

    res.status(200).json({ success: true, data: reel });
});

export const followReel = asyncHandler(async (req, res) => {
    const reel = await PromotionalReelService.followReel(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: reel });
});

export const unfollowReel = asyncHandler(async (req, res) => {
    const reel = await PromotionalReelService.unfollowReel(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: reel });
});

export const toggleLike = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.adminId || req.user.vendorId || req.user._id;
    const result = await PromotionalReelService.toggleLike(req.params.id, userId);

    // Clear reel cache
    await clearReelCache(req.params.id);

    res.status(200).json({ success: true, data: result });
});

export const getLiked = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.adminId || req.user.vendorId || req.user._id;
    const { reelIds } = req.query;
    const reelIdsArray = reelIds ? reelIds.split(',') : [];
    const likedReelIds = await PromotionalReelService.getLikedReels(userId, reelIdsArray);
    res.status(200).json({ success: true, data: { likedReelIds } });
});

export const addComment = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.adminId || req.user.vendorId || req.user._id;
    const { text } = req.body;
    const comment = await PromotionalReelService.addComment(req.params.id, userId, text);

    // Clear reel cache
    await clearReelCache(req.params.id);

    res.status(201).json({ success: true, data: comment });
});

export const getComments = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const comments = await PromotionalReelService.getComments(req.params.id, parseInt(page) || 1, parseInt(limit) || 50);
    res.status(200).json({ success: true, data: { comments } });
});

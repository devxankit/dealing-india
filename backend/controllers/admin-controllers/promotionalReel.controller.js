import PromotionalReelService from '../../services/promotionalReel.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

export const createReel = asyncHandler(async (req, res) => {
    // Handle file uploads if present
    const videoFile = req.files?.video ? req.files.video[0] : null;
    const thumbnailFile = req.files?.thumbnail ? req.files.thumbnail[0] : null;

    // Use adminId from token or _id if available
    const adminId = req.user.adminId || req.user._id;

    const reel = await PromotionalReelService.createReel(req.body, videoFile, thumbnailFile, adminId);
    res.status(201).json({ success: true, count: 1, data: reel });
});

export const getReels = asyncHandler(async (req, res) => {
    const reels = await PromotionalReelService.getAllReels(req.query);
    res.status(200).json({ success: true, count: reels.length, data: reels });
});

export const deleteReel = asyncHandler(async (req, res) => {
    await PromotionalReelService.deleteReel(req.params.id);
    res.status(200).json({ success: true, message: 'Promotional Reel deleted' });
});

export const updateReel = asyncHandler(async (req, res) => {
    const reel = await PromotionalReelService.updateReel(req.params.id, req.body);
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
    res.status(201).json({ success: true, data: comment });
});

export const getComments = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const comments = await PromotionalReelService.getComments(req.params.id, parseInt(page) || 1, parseInt(limit) || 50);
    res.status(200).json({ success: true, data: { comments } });
});

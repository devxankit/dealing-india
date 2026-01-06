import { toggleReelLike, getLikedReels } from '../../services/reelLikes.service.js';

/**
 * Toggle like on a reel
 * POST /api/user/reels/:reelId/like
 */
export const toggleLike = async (req, res, next) => {
  try {
    const { reelId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await toggleReelLike(reelId, userId);

    res.status(200).json({
      success: true,
      message: result.isLiked ? 'Reel liked' : 'Reel unliked',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get liked reels for current user
 * GET /api/user/reels/liked
 */
export const getLiked = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { reelIds } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const reelIdsArray = reelIds ? reelIds.split(',') : [];
    const likedReelIds = await getLikedReels(userId, reelIdsArray);

    res.status(200).json({
      success: true,
      data: { likedReelIds },
    });
  } catch (error) {
    next(error);
  }
};


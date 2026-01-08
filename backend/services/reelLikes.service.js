import Reel from '../models/Reel.model.js';
import ReelLike from '../models/ReelLike.model.js';

/**
 * Toggle like on a reel
 * @param {String} reelId - Reel ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} { isLiked, likes }
 */
export const toggleReelLike = async (reelId, userId) => {
  try {
    // Check if reel exists
    const reel = await Reel.findById(reelId);
    if (!reel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    // Check if user already liked this reel
    const existingLike = await ReelLike.findOne({ reelId, userId, reelModel: 'Reel' });

    if (existingLike) {
      // Unlike - remove like and decrement count
      await ReelLike.findByIdAndDelete(existingLike._id);
      reel.likes = Math.max(0, reel.likes - 1);
      await reel.save();
      return { isLiked: false, likes: reel.likes };
    } else {
      // Like - add like and increment count
      await ReelLike.create({ reelId, userId, reelModel: 'Reel' });
      reel.likes = (reel.likes || 0) + 1;
      await reel.save();
      return { isLiked: true, likes: reel.likes };
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get liked reels for a user
 * @param {String} userId - User ID
 * @param {Array} reelIds - Array of reel IDs to check
 * @returns {Promise<Array>} Array of liked reel IDs
 */
export const getLikedReels = async (userId, reelIds = []) => {
  try {
    if (!userId || reelIds.length === 0) {
      return [];
    }

    const likes = await ReelLike.find({
      userId,
      reelModel: 'Reel',
      reelId: { $in: reelIds },
    }).select('reelId');

    return likes.map(like => like.reelId.toString());
  } catch (error) {
    throw error;
  }
};


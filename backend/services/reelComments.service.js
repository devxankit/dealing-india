import ReelComment from '../models/ReelComment.model.js';
import Reel from '../models/Reel.model.js';

/**
 * Get comments for a reel
 * @param {String} reelId - Reel ID
 * @param {Object} options - { page, limit }
 * @returns {Promise<Object>} { comments, total, page, totalPages }
 */
export const getReelComments = async (reelId, options = {}) => {
  try {
    const { page = 1, limit = 50 } = options;

    // Verify reel exists
    const reel = await Reel.findById(reelId);
    if (!reel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get comments
    const [comments, total] = await Promise.all([
      ReelComment.find({ reelId, isActive: true })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReelComment.countDocuments({ reelId, isActive: true }),
    ]);

    // Format comments
    const formattedComments = comments.map(comment => ({
      id: comment._id,
      text: comment.text,
      userId: comment.userId?._id,
      userName: comment.userId?.name || 'Anonymous',
      userEmail: comment.userId?.email,
      createdAt: comment.createdAt,
      timeAgo: getTimeAgo(comment.createdAt),
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      comments: formattedComments,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Add a comment to a reel
 * @param {String} reelId - Reel ID
 * @param {String} userId - User ID
 * @param {String} text - Comment text
 * @returns {Promise<Object>} Created comment
 */
export const addReelComment = async (reelId, userId, text) => {
  try {
    // Verify reel exists and is active
    const reel = await Reel.findById(reelId);
    if (!reel) {
      const err = new Error('Reel not found');
      err.status = 404;
      throw err;
    }

    if (reel.status !== 'active') {
      const err = new Error('Cannot comment on inactive reel');
      err.status = 403;
      throw err;
    }

    // Validate comment text
    if (!text || !text.trim()) {
      const err = new Error('Comment text is required');
      err.status = 400;
      throw err;
    }

    if (text.trim().length > 500) {
      const err = new Error('Comment cannot exceed 500 characters');
      err.status = 400;
      throw err;
    }

    // Create comment
    const comment = await ReelComment.create({
      reelId,
      userId,
      text: text.trim(),
    });

    // Update reel comment count
    await Reel.findByIdAndUpdate(reelId, {
      $inc: { comments: 1 },
    });

    // Populate and return
    const populatedComment = await ReelComment.findById(comment._id)
      .populate('userId', 'name email')
      .lean();

    return {
      id: populatedComment._id,
      text: populatedComment.text,
      userId: populatedComment.userId?._id,
      userName: populatedComment.userId?.name || 'Anonymous',
      userEmail: populatedComment.userId?.email,
      createdAt: populatedComment.createdAt,
      timeAgo: getTimeAgo(populatedComment.createdAt),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a comment (soft delete)
 * @param {String} commentId - Comment ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Object>} Success message
 */
export const deleteReelComment = async (commentId, userId) => {
  try {
    const comment = await ReelComment.findById(commentId);
    if (!comment) {
      const err = new Error('Comment not found');
      err.status = 404;
      throw err;
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== userId.toString()) {
      const err = new Error('Unauthorized to delete this comment');
      err.status = 403;
      throw err;
    }

    // Soft delete
    comment.isActive = false;
    await comment.save();

    // Decrement reel comment count
    await Reel.findByIdAndUpdate(comment.reelId, {
      $inc: { comments: -1 },
    });

    return { success: true, message: 'Comment deleted successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Helper function to get time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
}


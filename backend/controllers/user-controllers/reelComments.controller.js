import { getReelComments, addReelComment, deleteReelComment } from '../../services/reelComments.service.js';

/**
 * Get comments for a reel
 * GET /api/user/reels/:reelId/comments
 */
export const getComments = async (req, res, next) => {
  try {
    const { reelId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await getReelComments(reelId, { page, limit });

    res.status(200).json({
      success: true,
      message: 'Comments retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a comment to a reel
 * POST /api/user/reels/:reelId/comments
 */
export const addComment = async (req, res, next) => {
  try {
    const { reelId } = req.params;
    const { text } = req.body;
    const userId = req.user?._id || req.userDoc?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    const comment = await addReelComment(reelId, userId, text);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a comment
 * DELETE /api/user/reels/comments/:commentId
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id || req.userDoc?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await deleteReelComment(commentId, userId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};


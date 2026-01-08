import PromotionalReel from '../models/PromotionalReel.model.js';
import MegaRewardSettings from '../models/MegaRewardSettings.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';
import User from '../models/User.model.js';

class PromotionalReelService {
    /**
     * Create a new promotional reel
     */
    async createReel(data, videoFile, thumbnailFile, adminId) {
        let videoUrl = data.videoUrl;
        let thumbnailUrl = data.thumbnailUrl || data.thumbnail; // Handle both key names

        // Prepare upload promises
        const uploadPromises = [];

        // Video Upload Promise
        if (videoFile) {
            uploadPromises.push(
                uploadToCloudinary(videoFile.buffer, 'promotional-reels/videos', { resource_type: 'video' })
                    .then(result => { videoUrl = result.secure_url; })
            );
        }

        // Thumbnail Upload Promise
        if (thumbnailFile) {
            uploadPromises.push(
                uploadToCloudinary(thumbnailFile.buffer, 'promotional-reels/thumbnails')
                    .then(result => { thumbnailUrl = result.secure_url; })
            );
        }

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        if (!videoUrl) {
            throw new Error('Video source is required (file or URL)');
        }

        // If no megaRewardId provided, try to link to the active campaign automatically
        let megaRewardId = data.megaRewardId || null;
        if (!megaRewardId) {
            const activeCampaign = await MegaRewardSettings.findOne({ isActive: true });
            if (activeCampaign) {
                megaRewardId = activeCampaign._id;
            }
        }

        return await PromotionalReel.create({
            title: data.title,
            description: data.description,
            videoUrl,
            thumbnail: thumbnailUrl,
            uploadedBy: adminId,
            megaRewardId
        });
    }

    /**
     * Get all reels with filters (admin usually sees all)
     */
    async getAllReels(filter = {}) {
        const reels = await PromotionalReel.find(filter)
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'name email')
            .lean();

        // Ensure engagement fields exist
        return reels.map(reel => ({
            ...reel,
            likes: reel.likes || 0,
            comments: reel.comments || 0,
            shares: reel.shares || 0
        }));
    }

    /**
     * Get a single reel by ID
     */
    async getReelById(id) {
        return await PromotionalReel.findById(id);
    }

    /**
     * Update a reel
     */
    async updateReel(id, data) {
        return await PromotionalReel.findByIdAndUpdate(id, data, { new: true });
    }

    /**
     * Delete a reel
     */
    async deleteReel(id) {
        return await PromotionalReel.findByIdAndDelete(id);
    }

    /**
     * Increment share count
     */
    async incrementShare(id) {
        return await PromotionalReel.findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true });
    }

    /**
     * Handle user following a reel/creator
     */
    async followReel(reelId, userId) {
        const reel = await PromotionalReel.findById(reelId);
        if (!reel) throw new Error('Reel not found');

        // Check if already following
        if (reel.followers.includes(userId)) {
            return reel; // Already following
        }

        reel.followers.push(userId);
        await reel.save();
        return reel;
    }

    /**
     * Handle user unfollowing a reel/creator
     */
    async unfollowReel(reelId, userId) {
        return await PromotionalReel.findByIdAndUpdate(
            reelId,
            { $pull: { followers: userId } },
            { new: true }
        );
    }

    /**
     * Toggle like on a promotional reel
     */
    async toggleLike(reelId, userId) {
        const reelExists = await PromotionalReel.exists({ _id: reelId });
        if (!reelExists) throw new Error('Promotional Reel not found');

        const existingLike = await ReelLike.findOne({ reelId, userId, reelModel: 'PromotionalReel' });

        if (existingLike) {
            await ReelLike.findByIdAndDelete(existingLike._id);
            const updatedReel = await PromotionalReel.findByIdAndUpdate(
                reelId,
                { $inc: { likes: -1 } },
                { new: true, runValidators: true }
            );
            return { isLiked: false, likes: updatedReel.likes || 0 };
        } else {
            await ReelLike.create({ reelId, userId, reelModel: 'PromotionalReel' });
            const updatedReel = await PromotionalReel.findByIdAndUpdate(
                reelId,
                { $inc: { likes: 1 } },
                { new: true, runValidators: true }
            );
            return { isLiked: true, likes: updatedReel.likes || 0 };
        }
    }

    /**
     * Get liked promotional reels for a user
     */
    async getLikedReels(userId, reelIds = []) {
        if (!userId || reelIds.length === 0) return [];

        const likes = await ReelLike.find({
            userId,
            reelModel: 'PromotionalReel',
            reelId: { $in: reelIds }
        }).select('reelId');

        return likes.map(l => l.reelId.toString());
    }

    /**
     * Add comment to promotional reel
     */
    async addComment(reelId, userId, text) {
        const reelExists = await PromotionalReel.exists({ _id: reelId });
        if (!reelExists) throw new Error('Promotional Reel not found');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const comment = await ReelComment.create({
            reelId,
            userId,
            text,
            reelModel: 'PromotionalReel'
        });

        await PromotionalReel.findByIdAndUpdate(
            reelId,
            { $inc: { comments: 1 } }
        );

        return {
            id: comment._id,
            text: comment.text,
            userName: user.name,
            createdAt: comment.createdAt,
            timeAgo: 'Just now'
        };
    }

    /**
     * Get comments for a promotional reel
     */
    async getComments(reelId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const comments = await ReelComment.find({ reelId, reelModel: 'PromotionalReel', isActive: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name');

        return comments.map(c => ({
            id: c._id,
            text: c.text,
            userName: c.userId?.name || 'Unknown User',
            createdAt: c.createdAt,
            timeAgo: this._getTimeAgo(c.createdAt)
        }));
    }

    /**
     * Helper to format time ago
     */
    _getTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }
}

export default new PromotionalReelService();

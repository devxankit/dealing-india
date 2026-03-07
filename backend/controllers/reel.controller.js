import Reel from '../models/Reel.model.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';
import YouTubePlaylistMap from '../models/YouTubePlaylistMap.model.js';
import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import { publishReelToYouTube } from '../services/youtubeReel.service.js';

const REEL_ACTIVE_HOURS = 24;

/** Get uploader display name */
async function getUploaderName(uploaderId, uploaderType) {
  if (uploaderType === 'vendor') {
    const v = await Vendor.findById(uploaderId).select('storeName name').lean();
    return v?.storeName || v?.name || 'Vendor';
  }
  const u = await User.findById(uploaderId).select('name').lean();
  return u?.name || 'User';
}

/**
 * Upload reel (vendor or user)
 * POST /api/reels
 * Body: multipart with video file + title, description, categoryId, categoryName, productId?, propertyId?
 */
export const uploadReel = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, message: 'Video file is required' });
  }
  const { title, description, categoryId, categoryName, productId, propertyId } = req.body;
  if (!title || !categoryName) {
    return res.status(400).json({ success: false, message: 'Title and category are required' });
  }
  const role = req.user.role;
  if (role !== 'vendor' && role !== 'user') {
    return res.status(403).json({ success: false, message: 'Only vendors or users can upload reels' });
  }
  const uploaderId = req.user.vendorId || req.user.id;
  const uploaderType = role === 'vendor' ? 'vendor' : 'user';
  const uploaderName = await getUploaderName(uploaderId, uploaderType);

  const uploadResult = await uploadToCloudinary(req.file.buffer, 'reels', {
    resource_type: 'video',
    timeout: 120000,
    eager_async: true,
  });
  if (!uploadResult?.secure_url) {
    return res.status(500).json({ success: false, message: 'Video upload failed' });
  }

  const reel = await Reel.create({
    title: String(title).trim().slice(0, 100),
    description: description ? String(description).trim().slice(0, 500) : '',
    categoryId: categoryId || null,
    categoryName: String(categoryName).trim(),
    productId: productId || null,
    propertyId: propertyId || null,
    uploaderId,
    uploaderType,
    uploaderName,
    videoUrl: uploadResult.secure_url,
    videoPublicId: uploadResult.public_id || null,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    message: 'Reel submitted for moderation',
    data: { reel: reel.toObject() },
  });
});

/**
 * My reels (vendor or user)
 * GET /api/reels/my
 */
export const getMyReels = asyncHandler(async (req, res) => {
  const role = req.user.role;
  if (role !== 'vendor' && role !== 'user') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const uploaderId = req.user.vendorId || req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [reels, total] = await Promise.all([
    Reel.find({ uploaderId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Reel.countDocuments({ uploaderId }),
  ]);

  res.status(200).json({
    success: true,
    data: { reels },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Admin: list reels for moderation (pending first, filters)
 * GET /api/admin/reels
 */
export const adminListReels = asyncHandler(async (req, res) => {
  const { status, categoryName, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (categoryName) filter.categoryName = new RegExp(categoryName, 'i');
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const [reels, total] = await Promise.all([
    Reel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Reel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { reels },
    pagination: { page: parseInt(page), limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * Admin: get one reel (for preview)
 * GET /api/admin/reels/:id
 */
export const adminGetReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id).lean();
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  res.status(200).json({ success: true, data: { reel } });
});

/**
 * Admin: approve reel → upload to YouTube, add to category playlist, set approved
 * POST /api/admin/reels/:id/approve
 */
export const adminApproveReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (reel.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Reel is already ${reel.status}` });
  }

  let youtubeVideoId = null;
  let youtubePlaylistId = null;
  let youtubeUploadFailed = false;
  let youtubeUploadError = null;

  try {
    const result = await publishReelToYouTube(reel);
    youtubeVideoId = result?.youtubeVideoId || null;
    youtubePlaylistId = result?.youtubePlaylistId || null;
  } catch (err) {
    youtubeUploadFailed = true;
    youtubeUploadError = err.message || 'YouTube upload failed';
  }

  reel.status = 'approved';
  reel.approvedAt = new Date();
  reel.approvedBy = req.user.adminId || req.user.id;
  reel.youtubeVideoId = youtubeVideoId;
  reel.youtubePlaylistId = youtubePlaylistId;
  reel.youtubeUploadFailed = youtubeUploadFailed;
  reel.youtubeUploadError = youtubeUploadError;
  await reel.save();

  res.status(200).json({
    success: true,
    message: youtubeUploadFailed
      ? 'Reel approved but YouTube upload failed. Video will play from platform until 24h.'
      : 'Reel approved and published to YouTube',
    data: {
      reel: reel.toObject(),
      youtubeUploadFailed,
      youtubeUploadError: youtubeUploadFailed ? youtubeUploadError : undefined,
    },
  });
});

/**
 * Admin: reject reel
 * POST /api/admin/reels/:id/reject
 * Body: { reason?: string }
 */
export const adminRejectReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (reel.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Reel is already ${reel.status}` });
  }
  reel.status = 'rejected';
  reel.rejectReason = req.body?.reason?.trim() || null;
  await reel.save();
  res.status(200).json({ success: true, message: 'Reel rejected', data: { reel: reel.toObject() } });
});

/**
 * Admin: delete reel
 * DELETE /api/admin/reels/:id
 */
export const adminDeleteReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  await ReelLike.deleteMany({ reelId: reel._id });
  await ReelComment.deleteMany({ reelId: reel._id });
  await Reel.findByIdAndDelete(reel._id);
  res.status(200).json({ success: true, message: 'Reel deleted' });
});

/**
 * Public feed: approved reels within last 24 hours
 * GET /api/reels/feed
 */
export const getFeed = asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - REEL_ACTIVE_HOURS * 60 * 60 * 1000);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const categoryName = req.query.category;

  const filter = { status: 'approved', approvedAt: { $gte: cutoff } };
  if (categoryName) filter.categoryName = new RegExp(categoryName, 'i');

  const reels = await Reel.find(filter)
    .sort({ approvedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const reelIds = reels.map((r) => r._id);
  const likesCount = await ReelLike.aggregate([
    { $match: { reelId: { $in: reelIds } } },
    { $group: { _id: '$reelId', count: { $sum: 1 } } },
  ]);
  const commentsCount = await ReelComment.aggregate([
    { $match: { reelId: { $in: reelIds } } },
    { $group: { _id: '$reelId', count: { $sum: 1 } } },
  ]);
  const likeMap = new Map(likesCount.map((x) => [x._id.toString(), x.count]));
  const commentMap = new Map(commentsCount.map((x) => [x._id.toString(), x.count]));

  let userLikedSet = new Set();
  const currentUserId = req.user?.id || req.user?.vendorId;
  if (currentUserId) {
    const userLikes = await ReelLike.find({ reelId: { $in: reelIds }, userId: currentUserId })
      .select('reelId')
      .lean();
    userLikedSet = new Set(userLikes.map((l) => l.reelId.toString()));
  }

  const feed = reels.map((r) => ({
    ...r,
    likeCount: likeMap.get(r._id.toString()) || 0,
    commentCount: commentMap.get(r._id.toString()) || 0,
    userLiked: userLikedSet.has(r._id.toString()),
  }));

  const total = await Reel.countDocuments(filter);
  res.status(200).json({
    success: true,
    data: { reels: feed },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Like reel
 * POST /api/reels/:id/like
 */
export const likeReel = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required to like' });
  }
  const reel = await Reel.findById(req.params.id).lean();
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  if (reel.status !== 'approved' || !reel.approvedAt) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
  }
  const cutoff = new Date(Date.now() - REEL_ACTIVE_HOURS * 60 * 60 * 1000);
  if (reel.approvedAt < cutoff) {
    return res.status(400).json({ success: false, message: 'Reel has expired' });
  }

  await ReelLike.findOneAndUpdate(
    { reelId: reel._id, userId },
    { $set: { reelId: reel._id, userId } },
    { upsert: true }
  );
  const count = await ReelLike.countDocuments({ reelId: reel._id });
  res.status(200).json({ success: true, data: { liked: true, likeCount: count } });
});

/**
 * Unlike reel
 * DELETE /api/reels/:id/like
 */
export const unlikeReel = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }
  await ReelLike.findOneAndDelete({ reelId: req.params.id, userId });
  const count = await ReelLike.countDocuments({ reelId: req.params.id });
  res.status(200).json({ success: true, data: { liked: false, likeCount: count } });
});

/**
 * List comments for a reel
 * GET /api/reels/:id/comments
 */
export const getComments = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id).lean();
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

  const comments = await ReelComment.find({ reelId: reel._id })
    .sort({ createdAt: 1 })
    .populate('userId', 'name')
    .lean();
  const list = comments.map((c) => ({
    _id: c._id,
    text: c.text,
    userId: c.userId?._id,
    userName: c.userId?.name || 'User',
    createdAt: c.createdAt,
  }));
  res.status(200).json({ success: true, data: { comments: list } });
});

/**
 * Add comment
 * POST /api/reels/:id/comments
 * Body: { text: string }
 */
export const addComment = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required to comment' });
  }
  const reel = await Reel.findById(req.params.id);
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  if (reel.status !== 'approved' || !reel.approvedAt) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
  }
  const cutoff = new Date(Date.now() - REEL_ACTIVE_HOURS * 60 * 60 * 1000);
  if (reel.approvedAt < cutoff) {
    return res.status(400).json({ success: false, message: 'Reel has expired' });
  }
  const text = req.body?.text?.trim();
  if (!text || text.length > 500) {
    return res.status(400).json({ success: false, message: 'Comment text required (max 500 chars)' });
  }

  const comment = await ReelComment.create({
    reelId: reel._id,
    userId,
    text,
  });
  await comment.populate('userId', 'name');
  res.status(201).json({
    success: true,
    data: {
      comment: {
        _id: comment._id,
        text: comment.text,
        userId: comment.userId?._id,
        userName: comment.userId?.name || 'User',
        createdAt: comment.createdAt,
      },
    },
  });
});

/**
 * Get YouTube playlist ID for a category (for embedding)
 * GET /api/reels/playlist/:categoryName
 */
export const getPlaylistByCategory = asyncHandler(async (req, res) => {
  const categoryName = decodeURIComponent(req.params.categoryName || '').trim();
  if (!categoryName) {
    return res.status(400).json({ success: false, message: 'Category name required' });
  }
  const map = await YouTubePlaylistMap.findOne({
    categoryName: new RegExp('^' + categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
  }).lean();
  if (!map) {
    return res.status(200).json({
      success: true,
      data: { youtubePlaylistId: null, categoryName },
    });
  }
  res.status(200).json({
    success: true,
    data: {
      youtubePlaylistId: map.youtubePlaylistId,
      youtubePlaylistTitle: map.youtubePlaylistTitle,
      categoryName: map.categoryName,
    },
  });
});

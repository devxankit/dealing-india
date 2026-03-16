import Reel from '../models/Reel.model.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';
import ReelView from '../models/ReelView.model.js';
import YouTubePlaylistMap from '../models/YouTubePlaylistMap.model.js';
import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import Music from '../models/Music.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import { publishReelToYouTube, fetchPlaylistItems, fetchVideoById, deleteVideoFromYouTube } from '../services/youtubeReel.service.js';

const REEL_ACTIVE_HOURS = 24; // kept for backwards compatibility only

/** Heal malformed or nested Cloudinary URLs into a clean, single-transformation format */
function healReelUrl(url) {
  if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) return url;

  const parts = url.split('/upload/');
  const versionMatch = parts[1].match(/(v\d+\/.*)$/);
  if (!versionMatch) return url;

  const base = parts[0];
  const cleanPath = versionMatch[0]; // v123/reels/abc.mp4
  const transformString = parts[1].substring(0, versionMatch.index);

  // If there's no transformation (clean URL), just return it
  if (!transformString || transformString === '/') {
    return `${base}/upload/${cleanPath}`;
  }

  // Extract the latest music ID if multiple exist
  const layers = transformString.split('/').filter(s => s.startsWith('l_audio:') || s.startsWith('l_video:'));
  if (layers.length === 0) {
    // No audio layers? Just return the clean version
    return `${base}/upload/${cleanPath}`;
  }

  let musicPart = layers[layers.length - 1];

  // Fix common malformations. 
  // Since music is uploaded as resource_type: video, we use l_video:
  const rawId = musicPart.replace('l_audio:', '').replace('l_video:', '').replace('video:upload:', '').replace('upload:', '');
  musicPart = `l_video:${rawId.replace(/\//g, ':')}`;

  // Build clean URL: mute original + latest music layer + apply
  const healed = `${base}/upload/e_mute/${musicPart}/fl_layer_apply/${cleanPath}`;
  return healed;
}

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

  // Enforce max duration of 60 seconds (best-effort, based on Cloudinary metadata)
  const maxSeconds = 60;
  if (uploadResult.duration && uploadResult.duration > maxSeconds + 0.5) {
    // Attempt to clean up uploaded asset, but don't block on failure
    if (uploadResult.public_id) {
      deleteFromCloudinary(uploadResult.public_id).catch(() => { });
    }
    return res.status(400).json({
      success: false,
      message: `Reel video must be ${maxSeconds} seconds or shorter`,
    });
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
    originalVideoUrl: uploadResult.secure_url,
    videoPublicId: uploadResult.public_id || null,
    durationSeconds: uploadResult.duration || null,
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
    // Proactively heal URLs corrupted by legacy bugs (missing :upload: or nested transforms)
    if (reel.videoUrl?.includes('cloudinary.com') && reel.videoUrl.includes('l_audio:')) {
      reel.videoUrl = healReelUrl(reel.videoUrl);
    }

    const result = await publishReelToYouTube(reel);
    youtubeVideoId = result?.youtubeVideoId || null;
    youtubePlaylistId = result?.youtubePlaylistId || null;
  } catch (err) {
    youtubeUploadFailed = true;
    youtubeUploadError = err.message || 'YouTube upload failed';
    // Log so production admins can see why upload failed (e.g. missing env, unreachable videoUrl)
    console.error('[Reel approve] YouTube upload failed:', err.message, {
      reelId: reel._id,
      videoUrl: reel.videoUrl ? 'set' : 'missing',
      details: err.response?.data || null,
    });
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
 * Admin: retry YouTube upload for an approved reel (no status change)
 * POST /api/admin/reels/:id/retry-youtube
 */
export const adminRetryYouTubeUpload = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel must be approved to retry YouTube upload' });
  }
  if (reel.youtubeVideoId) {
    return res.status(400).json({ success: false, message: 'Reel already uploaded to YouTube' });
  }

  let youtubeVideoId = null;
  let youtubePlaylistId = null;
  let youtubeUploadFailed = false;
  let youtubeUploadError = null;

  try {
    // Proactively heal URLs corrupted by legacy bugs (missing :upload: or nested transforms)
    if (reel.videoUrl?.includes('cloudinary.com') && reel.videoUrl.includes('l_audio:')) {
      reel.videoUrl = healReelUrl(reel.videoUrl);
    }

    const result = await publishReelToYouTube(reel);
    youtubeVideoId = result?.youtubeVideoId || null;
    youtubePlaylistId = result?.youtubePlaylistId || null;
  } catch (err) {
    youtubeUploadFailed = true;
    youtubeUploadError = err.message || 'YouTube upload failed';
    console.error('[Reel retry] YouTube upload failed:', err.message, {
      reelId: reel._id,
      videoUrl: reel.videoUrl ? 'set' : 'missing',
      details: err.response?.data || null,
    });
  }

  reel.youtubeVideoId = youtubeVideoId;
  reel.youtubePlaylistId = youtubePlaylistId;
  reel.youtubeUploadFailed = youtubeUploadFailed;
  reel.youtubeUploadError = youtubeUploadError;
  await reel.save();

  return res.status(200).json({
    success: true,
    message: youtubeUploadFailed
      ? 'YouTube retry failed. Video will continue playing from the platform.'
      : 'Reel uploaded to YouTube successfully',
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

  // 1. Delete from YouTube if approved
  if (reel.youtubeVideoId) {
    await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
      console.error('[adminDeleteReel] YouTube delete failed:', err.message);
    });
  }

  // 2. Delete from Cloudinary
  if (reel.videoPublicId) {
    await deleteFromCloudinary(reel.videoPublicId, 'video').catch(() => { });
  }
  if (reel.thumbnailUrl && reel.thumbnailUrl.includes('cloudinary.com')) {
    await deleteFromCloudinary(reel.thumbnailUrl, 'image').catch(() => { });
  }

  // 3. Delete from DB (Likes, Comments, Reel)
  await ReelLike.deleteMany({ reelId: reel._id });
  await ReelComment.deleteMany({ reelId: reel._id });
  await ReelView.deleteMany({ reelId: reel._id });
  await Reel.findByIdAndDelete(reel._id);

  res.status(200).json({ success: true, message: 'Reel deleted successfully' });
});

/**
 * Delete my reel (vendor or user)
 * DELETE /api/reels/:id
 */
export const deleteMyReel = asyncHandler(async (req, res) => {
  const uploaderId = req.user.vendorId || req.user.id;
  const reel = await Reel.findById(req.params.id);

  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // Ensure ownership
  if (reel.uploaderId.toString() !== uploaderId.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this reel' });
  }

  // 1. Delete from YouTube if approved
  if (reel.youtubeVideoId) {
    await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
      console.error('[deleteMyReel] YouTube delete failed:', err.message);
    });
  }

  // 2. Delete from Cloudinary
  if (reel.videoPublicId) {
    await deleteFromCloudinary(reel.videoPublicId, 'video').catch(() => { });
  }
  if (reel.thumbnailUrl && reel.thumbnailUrl.includes('cloudinary.com')) {
    await deleteFromCloudinary(reel.thumbnailUrl, 'image').catch(() => { });
  }

  // 3. Delete from DB (Likes, Comments, Reel)
  await ReelLike.deleteMany({ reelId: reel._id });
  await ReelComment.deleteMany({ reelId: reel._id });
  await ReelView.deleteMany({ reelId: reel._id });
  await Reel.findByIdAndDelete(reel._id);

  res.status(200).json({ success: true, message: 'Reel deleted successfully' });
});


/**
 * Vendor: Replace song in copyrighted reel
 * POST /api/reels/:id/replace-song
 * Body: { musicId: string }
 */
export const replaceSong = asyncHandler(async (req, res) => {
  const { musicId } = req.body;
  if (!musicId) return res.status(400).json({ success: false, message: 'Music selection is required' });

  const reel = await Reel.findById(req.params.id);
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

  // Admin can replace song OR the owner (vendor/user)
  const isOwner = (req.user.vendorId || req.user.id) === reel.uploaderId.toString();
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const music = await Music.findById(musicId);
  if (!music || !music.isActive) {
    return res.status(404).json({ success: false, message: 'Approved music not found' });
  }

  // Ensure originalVideoUrl is clean (no transformations)
  if (!reel.originalVideoUrl || reel.originalVideoUrl.includes('fl_layer_apply')) {
    // Re-extract clean path from whatever we have
    const oldUrl = reel.originalVideoUrl || reel.videoUrl;
    const parts = oldUrl.split('/upload/');
    const versionMatch = parts[1]?.match(/(v\d+\/.*)$/);
    if (versionMatch) {
      reel.originalVideoUrl = `${parts[0]}/upload/${versionMatch[1]}`;
    } else {
      reel.originalVideoUrl = oldUrl;
    }
  }

  const musicPublicId = music.publicId.replace(/\//g, ':');
  const [base, pathPart] = reel.originalVideoUrl.split('/upload/');
  const versionPath = pathPart.startsWith('/') ? pathPart.substring(1) : pathPart;

  // Format: l_video:folder:id
  // NOTE: 'video' resource type is used for music overlays to support consistent processing
  const transformedUrl = `${base}/upload/e_mute/l_video:${musicPublicId}/fl_layer_apply/${versionPath}`;

  // Update reel state
  reel.videoUrl = transformedUrl;
  reel.audioStatus = 'replaced';
  reel.musicId = musicId;
  reel.status = 'pending';
  reel.isCopyrighted = false;

  if (reel.youtubeVideoId) {
    await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
      console.error('[replaceSong] YouTube delete failed:', err.message);
    });
    reel.youtubeVideoId = null;
    reel.youtubePlaylistId = null;
    reel.youtubeUploadFailed = false;
    reel.youtubeUploadError = null;
  }

  await reel.save();

  res.status(200).json({
    success: true,
    message: 'Song replaced. Reel submitted for re-approval.',
    data: { reel }
  });
});


/** True if id looks like a MongoDB ObjectId (24 hex chars); else treat as YouTube video id */
function isMongoId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Public feed: from YouTube playlist (no DB) when YOUTUBE_REELS_PLAYLIST_ID is set,
 * otherwise from DB (approved reels with youtubeVideoId).
 * GET /api/reels/feed
 */
export const getFeed = asyncHandler(async (req, res) => {
  const playlistId = process.env.YOUTUBE_REELS_PLAYLIST_ID;

  if (playlistId) {
    // Reels from YouTube only – no DB storage
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const pageToken = req.query.pageToken || null;
    let result;
    try {
      result = await fetchPlaylistItems(playlistId, pageToken, limit);
    } catch (err) {
      console.error('[Reels] YouTube playlist fetch failed:', err.message);
      return res.status(502).json({
        success: false,
        message: err.message || 'Failed to load reels from YouTube',
      });
    }
    const reels = result.items.map((item) => ({
      _id: item.id,
      youtubeVideoId: item.youtubeVideoId,
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      uploaderName: item.uploaderName,
      likeCount: 0,
      viewCount: 0,
      userLiked: false,
      vendorPhone: null,
      vendorStoreName: null,
      vendorId: null,
    }));
    return res.status(200).json({
      success: true,
      data: { reels },
      pagination: {
        nextPageToken: result.nextPageToken || null,
        pages: result.nextPageToken ? undefined : 1,
      },
    });
  }

  // Original: feed from DB (approved reels with YouTube video)
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const categoryName = req.query.category;
  const vendorIdFilter = req.query.vendorId || null;

  // Feed source: Only reels that have successfully reached YouTube
  const filter = {
    youtubeVideoId: { $type: 'string', $regex: /.+/ }, // Strictly non-empty YouTube ID
  };
   // Note: We don't check 'status' here because if it's on YouTube, it's implicitly approved/live.
  if (categoryName) filter.categoryName = new RegExp(categoryName, 'i');
  if (vendorIdFilter) {
    filter.uploaderType = 'vendor';
    filter.uploaderId = vendorIdFilter;
  }

  const reels = await Reel.find(filter)
    .sort({ approvedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const vendorIds = reels
    .filter((r) => r.uploaderType === 'vendor')
    .map((r) => r.uploaderId);
  let vendorMap = new Map();
  if (vendorIds.length) {
    const vendors = await Vendor.find({ _id: { $in: vendorIds } })
      .select('phone storeName')
      .lean();
    vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));
  }

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

  const feed = reels.map((r) => {
    const vendorInfo =
      r.uploaderType === 'vendor'
        ? vendorMap.get(r.uploaderId?.toString() || '') || null
        : null;

    return {
      ...r,
      likeCount: likeMap.get(r._id.toString()) || 0,
      commentCount: commentMap.get(r._id.toString()) || 0,
      userLiked: userLikedSet.has(r._id.toString()),
      vendorPhone: vendorInfo?.phone || null,
      vendorStoreName: vendorInfo?.storeName || r.uploaderName || null,
      viewCount: typeof r.viewCount === 'number' ? r.viewCount : 0,
      vendorId: r.uploaderType === 'vendor' ? (vendorInfo?._id || r.uploaderId) : null,
    };
  });

  const total = await Reel.countDocuments(filter);
  res.status(200).json({
    success: true,
    data: { reels: feed },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Get a single public reel by ID (for shared links). ID can be MongoDB _id or YouTube video id.
 * GET /api/reels/:id
 */
export const getReelById = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!isMongoId(id)) {
    // YouTube video id – fetch from YouTube, no DB
    const video = await fetchVideoById(id).catch(() => null);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    const feedItem = {
      _id: video.id,
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      uploaderName: video.uploaderName,
      likeCount: 0,
      viewCount: 0,
      userLiked: false,
      vendorPhone: null,
      vendorStoreName: null,
      vendorId: null,
    };
    return res.status(200).json({ success: true, data: { reel: feedItem } });
  }

  const reel = await Reel.findById(id).lean();
  if (!reel || !reel.youtubeVideoId) {
    return res.status(404).json({ success: false, message: 'Reel not found or not published to YouTube' });
  }

  let vendorInfo = null;
  if (reel.uploaderType === 'vendor' && reel.uploaderId) {
    const v = await Vendor.findById(reel.uploaderId).select('phone storeName').lean();
    vendorInfo = v;
  }

  const [likeCount, commentCount, userLiked] = await Promise.all([
    ReelLike.countDocuments({ reelId: reel._id }),
    ReelComment.countDocuments({ reelId: reel._id }),
    req.user?.id || req.user?.vendorId
      ? ReelLike.exists({ reelId: reel._id, userId: req.user.id || req.user.vendorId })
      : Promise.resolve(null),
  ]);

  const feedItem = {
    ...reel,
    likeCount: likeCount || 0,
    commentCount: commentCount || 0,
    userLiked: !!userLiked,
    vendorPhone: vendorInfo?.phone || null,
    vendorStoreName: vendorInfo?.storeName || reel.uploaderName || null,
    viewCount: typeof reel.viewCount === 'number' ? reel.viewCount : 0,
    vendorId: reel.uploaderType === 'vendor' ? (reel.uploaderId || null) : null,
  };

  res.status(200).json({
    success: true,
    data: { reel: feedItem },
  });
});

/**
 * Track a view for a reel (used by reel feed when a reel becomes active)
 * POST /api/reels/:id/view
 * For YouTube-only reels (id = video id), no-op and return 200.
 */
export const trackView = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id)) {
    return res.status(200).json({ success: true, data: { viewCount: 0 } });
  }
  const reel = await Reel.findById(req.params.id).select('status approvedAt viewCount').lean();
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
  }

  const userId = req.user?.id || req.user?.vendorId || null;
  let updatedViewCount = reel.viewCount ?? 0;

  if (userId) {
    // One counted view per user per reel
    const existing = await ReelView.findOne({ reelId: reel._id, userId }).lean();
    if (!existing) {
      await ReelView.create({ reelId: reel._id, userId });
      const updated = await Reel.findByIdAndUpdate(
        req.params.id,
        { $inc: { viewCount: 1 } },
        { new: true, select: 'viewCount' }
      ).lean();
      updatedViewCount = updated?.viewCount ?? updatedViewCount + 1;
    }
  } else {
    // Anonymous viewer: count every activation
    const updated = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true, select: 'viewCount' }
    ).lean();
    updatedViewCount = updated?.viewCount ?? updatedViewCount + 1;
  }

  res.status(200).json({
    success: true,
    data: { viewCount: updatedViewCount },
  });
});

/**
 * Like reel
 * POST /api/reels/:id/like
 * For YouTube-only reels (id = video id), no-op and return 200.
 */
export const likeReel = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required to like' });
  }
  if (!isMongoId(req.params.id)) {
    return res.status(200).json({ success: true, data: { liked: true, likeCount: 0 } });
  }
  const reel = await Reel.findById(req.params.id).lean();
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
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
  if (!isMongoId(req.params.id)) {
    return res.status(200).json({ success: true, data: { liked: false, likeCount: 0 } });
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
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
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

/**
 * Public: Minimal HTML page with meta tags for dynamic social preview
 * GET /api/reels/share/:id
 */
export const getReelSharePage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const reel = await Reel.findById(id).lean();

    const frontendUrl = process.env.FRONTEND_URL || 'https://dealingindia.com';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const redirectUrl = `${frontendUrl}/b2b/reels/${id}`;

    // Default values
    let title = "Check out this Reel on Dealing India";
    let description = "Watch high-quality product reels and bulk deals on India's premiere B2B marketplace.";
    const appIcon = `${frontendUrl}/logo-icon.png`;
    let image = `${backendUrl}/api/reels/share/fallback-image`; // Branded fallback

    if (reel) {
        const type = reel.propertyId ? "Property" : (reel.productId ? "Product" : "Reel");
        title = reel.title || `${type} from ${reel.uploaderName || 'Dealing India'}`;
        description = reel.description || `Watch this ${reel.categoryName || ''} ${type.toLowerCase()} in action on Dealing India.`;
        
        if (reel.thumbnailUrl) {
            image = reel.thumbnailUrl;
        } else if (reel.youtubeVideoId) {
            image = `https://img.youtube.com/vi/${reel.youtubeVideoId}/maxresdefault.jpg`;
        }
    } else if (id && !isMongoId(id)) {
        // ... (YT fetch logic remains)
    }

    // Generate HTML with correct tags for WhatsApp
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / Meta -->
    <meta property="og:site_name" content="Dealing India">
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="${redirectUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">

    <!-- Logic to redirect AFTER crawler has time to read tags -->
    <script type="text/javascript">
        // Small delay if not a bot (optional, but pure JS redirect is best)
        window.location.href = "${redirectUrl}";
    </script>
    <meta http-equiv="refresh" content="0; url=${redirectUrl}">
</head>
<body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="text-align: center;">
        <img src="${appIcon}" alt="Dealing India" style="width: 80px; margin-bottom: 20px;" onerror="this.style.display='none'">
        <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #7C3AED; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px;"></div>
        <p style="font-weight: 500;">Opening Reel...</p>
    </div>
    <style>
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</body>
</html>
  `.trim();

    res.set('Content-Type', 'text/html');
    res.send(html);
});

import VendorFollow from '../models/VendorFollow.model.js';
import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Toggle follow status for a vendor
 * POST /api/follow/toggle
 * Body: { vendorId: string }
 */
export const toggleFollow = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId; // Auth middleware sets req.user
  const { vendorId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!vendorId) {
    return res.status(400).json({ success: false, message: 'Vendor ID is required' });
  }

  // Check if vendor exists
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  // Check if already following
  const existingFollow = await VendorFollow.findOne({ userId, vendorId });

  if (existingFollow) {
    // Unfollow
    await VendorFollow.findByIdAndDelete(existingFollow._id);
    const count = await VendorFollow.countDocuments({ vendorId });
    return res.status(200).json({
      success: true,
      message: 'Unfollowed successfully',
      data: { isFollowing: false, followerCount: count }
    });
  } else {
    // Follow
    await VendorFollow.create({ userId, vendorId });
    const count = await VendorFollow.countDocuments({ vendorId });
    return res.status(201).json({
      success: true,
      message: 'Followed successfully',
      data: { isFollowing: true, followerCount: count }
    });
  }
});

/**
 * Get total followers count for a vendor
 * GET /api/follow/vendor/:vendorId
 */
export const getVendorFollowers = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const currentUserId = req.user?.id || req.user?.vendorId;

  if (!vendorId) {
    return res.status(400).json({ success: false, message: 'Vendor ID is required' });
  }

  const count = await VendorFollow.countDocuments({ vendorId });
  
  let isFollowing = false;
  if (currentUserId) {
    const follow = await VendorFollow.exists({ userId: currentUserId, vendorId });
    isFollowing = !!follow;
  }

  res.status(200).json({
    success: true,
    data: { followerCount: count, isFollowing }
  });
});

/**
 * Get list of vendors followed by a user
 * GET /api/follow/user/:userId
 */
export const getUserFollowedVendors = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user?.id || req.user?.vendorId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  const follows = await VendorFollow.find({ userId })
    .populate({
      path: 'vendorId',
      select: 'storeName storeLogo storeDescription phone whatsapp businessType'
    })
    .sort({ createdAt: -1 });

  // Map to just vendor details
  const vendors = follows
    .filter(f => f.vendorId) // Remove any null references
    .map(f => f.vendorId);

  res.status(200).json({
    success: true,
    data: { vendors }
  });
});

/**
 * Get list of users following the current logged-in vendor
 * GET /api/follow/vendor-followers
 */
export const getVendorFollowersList = asyncHandler(async (req, res) => {
  const vendorId = req.user?.vendorId || req.user?._id;

  if (!vendorId) {
    return res.status(401).json({ success: false, message: 'Vendor authentication required' });
  }

  // Double check if indeed a vendor
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  const followers = await VendorFollow.find({ vendorId })
    .populate({
      path: 'userId',
      select: 'name email profilePicture phone'
    })
    .sort({ createdAt: -1 });

  // Map to just user details
  const users = followers
    .filter(f => f.userId) // Remove any null references
    .map(f => ({
      ...f.userId.toObject ? f.userId.toObject() : f.userId,
      followedAt: f.createdAt
    }));

  res.status(200).json({
    success: true,
    data: { 
      followers: users,
      total: users.length
    }
  });
});


import * as heroBannerService from '../../services/heroBanner.service.js';
import redisService from '../../services/redis.service.js';

/**
 * Helper to clear banner-related cache
 */
const clearBannerCache = async () => {
  try {
    await redisService.clearPattern('public:banners:*');
  } catch (error) {
    console.error('Error clearing banner cache:', error);
  }
};

export const getSlots = async (req, res, next) => {
  try {
    // Get banner type from query parameter (default to 'hero' for backward compatibility)
    const bannerType = req.query.bannerType || 'hero';
    
    const slots = await heroBannerService.getBannerSlots(bannerType);
    const settings = await heroBannerService.getBannerSettings();

    res.status(200).json({
      success: true,
      data: { slots, settings, bannerType }
    });
  } catch (error) {
    next(error);
  }
};

export const updateSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slotData = req.body;
    const slot = await heroBannerService.updateSlot(id, slotData);

    // Clear cache
    await clearBannerCache();

    res.status(200).json({
      success: true,
      message: 'Banner slot updated successfully',
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    // Admin ID from token (adminId) or userDoc (_id)
    const adminId = req.user?.adminId || req.userDoc?._id || req.user?.id || req.user?._id;
    if (!adminId) {
      const error = new Error('Admin ID not found in authentication token');
      error.status = 401;
      return next(error);
    }

    const settingsData = req.body;
    const settings = await heroBannerService.updateBannerSettings(settingsData, adminId);

    // Clear cache
    await clearBannerCache();

    res.status(200).json({
      success: true,
      message: 'Banner settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await heroBannerService.getBookingById(id);

    if (!booking) {
      const error = new Error('Booking not found');
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    // Get banner type from query parameter (optional, returns all if not provided)
    const bannerType = req.query.bannerType || null;
    
    const bookings = await heroBannerService.getAllBookings(bannerType);
    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

export const approveBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await heroBannerService.approveBooking(id);

    res.status(200).json({
      success: true,
      message: 'Banner booking approved successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const rejectBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const booking = await heroBannerService.rejectBooking(id, reason);

    res.status(200).json({
      success: true,
      message: 'Banner booking rejected successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const getRevenueStats = async (req, res, next) => {
  try {
    const bannerType = req.query.bannerType || null;
    const stats = await heroBannerService.getBannerRevenueStats(bannerType);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const { search, limit = 50, skip = 0, bannerType } = req.query;
    const result = await heroBannerService.getBannerTransactions(search, parseInt(limit), parseInt(skip), bannerType || null);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

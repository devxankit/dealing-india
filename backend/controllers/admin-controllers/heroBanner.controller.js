import * as heroBannerService from '../../services/heroBanner.service.js';

export const getSlots = async (req, res, next) => {
  try {
    const slots = await heroBannerService.getBannerSlots();
    const settings = await heroBannerService.getBannerSettings();
    
    res.status(200).json({
      success: true,
      data: { slots, settings }
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    if (!adminId) {
      const error = new Error('Admin ID not found in authentication token');
      error.status = 401;
      return next(error);
    }
    
    const settingsData = req.body;
    const settings = await heroBannerService.updateBannerSettings(settingsData, adminId);
    
    res.status(200).json({
      success: true,
      message: 'Banner settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const bookings = await heroBannerService.getAllBookings();
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
    const stats = await heroBannerService.getBannerRevenueStats();
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
    const { search, limit = 50, skip = 0 } = req.query;
    const result = await heroBannerService.getBannerTransactions(search, parseInt(limit), parseInt(skip));
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

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
    const { universalDisplayTime } = req.body;
    const settings = await heroBannerService.updateBannerSettings(universalDisplayTime);
    
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

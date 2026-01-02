import * as heroBannerService from '../../services/heroBanner.service.js';

export const getAvailableSlots = async (req, res, next) => {
  try {
    const slots = await heroBannerService.getBannerSlots();
    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    next(error);
  }
};

export const createBannerBooking = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const booking = await heroBannerService.createBooking(vendorId, req.body, req.file);
    
    res.status(201).json({
      success: true,
      message: 'Booking initiated successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const bookings = await heroBannerService.getVendorBookings(vendorId);
    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (req, res, next) => {
  try {
    const { bookingId, transactionId } = req.body;
    const booking = await heroBannerService.confirmBookingPayment(bookingId, transactionId);
    
    res.status(200).json({
      success: true,
      message: 'Payment confirmed and banner activated',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

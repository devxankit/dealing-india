import * as heroBannerService from '../../services/heroBanner.service.js';

export const getAvailableSlots = async (req, res, next) => {
  try {
    // Get banner type from query or determine from vendor
    let bannerType = req.query.bannerType;
    
    if (!bannerType) {
      // Determine from vendor type
      const vendorId = req.user.vendorId || req.user.id;
      if (vendorId) {
        const Vendor = (await import('../../models/Vendor.model.js')).default;
        const vendor = await Vendor.findById(vendorId);
        if (vendor && vendor.vendorType === 'b2b') {
          bannerType = 'b2b';
        } else {
          bannerType = 'hero';
        }
      } else {
        bannerType = 'hero'; // Default
      }
    }

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

export const createBannerBooking = async (req, res, next) => {
  try {
    // Use vendorId from JWT token (preferred) or fallback to id
    const vendorId = req.user.vendorId || req.user.id;

    if (!vendorId) {
      const error = new Error('Vendor ID not found in authentication token');
      error.status = 401;
      return next(error);
    }

    // Validate required fields
    if (!req.body.slotId) {
      const error = new Error('Slot ID is required');
      error.status = 400;
      return next(error);
    }
    if (!req.body.startDate) {
      const error = new Error('Start date is required');
      error.status = 400;
      return next(error);
    }
    if (!req.body.durationHours && !req.body.durationDays) {
      const error = new Error('Duration is required');
      error.status = 400;
      return next(error);
    }
    if (!req.file && !req.body.bannerImage) {
      const error = new Error('Banner image is required');
      error.status = 400;
      return next(error);
    }

    // Get payment method from request body (default 'razorpay')
    const paymentMethod = req.body.paymentMethod || 'razorpay';

    const booking = await heroBannerService.createBooking(vendorId, req.body, req.file, paymentMethod);

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
    // Use vendorId from JWT token (preferred) or fallback to id
    const vendorId = req.user.vendorId || req.user.id;

    if (!vendorId) {
      const error = new Error('Vendor ID not found in authentication token');
      error.status = 401;
      return next(error);
    }

    // Get banner type from query or determine from vendor
    let bannerType = req.query.bannerType;
    if (!bannerType) {
      const Vendor = (await import('../../models/Vendor.model.js')).default;
      const vendor = await Vendor.findById(vendorId);
      if (vendor && vendor.vendorType === 'b2b') {
        bannerType = 'b2b';
      } else {
        bannerType = 'hero';
      }
    }

    const bookings = await heroBannerService.getVendorBookings(vendorId, bannerType);
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
    const { bookingId, razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentMethod } = req.body;

    if (!bookingId) {
      const error = new Error('Booking ID is required');
      error.status = 400;
      return next(error);
    }

    if (!razorpayPaymentId || !razorpayOrderId) {
      const error = new Error('Razorpay payment ID and order ID are required');
      error.status = 400;
      return next(error);
    }

    const paymentData = {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    };

    const booking = await heroBannerService.confirmBookingPayment(bookingId, paymentData, paymentMethod || 'razorpay');

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully. Waiting for admin approval.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const vendorId = req.user.vendorId || req.user.id;

    if (!bookingId) {
      const error = new Error('Booking ID is required');
      error.status = 400;
      return next(error);
    }

    // Use service to delete if unpaid
    await heroBannerService.deleteUnpaidBooking(bookingId, vendorId);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId || req.user.id;

    if (!vendorId) {
      const error = new Error('Vendor ID not found in authentication token');
      error.status = 401;
      return next(error);
    }

    // Using strict vendor check to ensure they can only see their own bookings
    const booking = await heroBannerService.getVendorBookingById(id, vendorId);

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

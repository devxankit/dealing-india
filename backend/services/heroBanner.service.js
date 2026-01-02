import BannerSlot from '../models/BannerSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Settings from '../models/Settings.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import razorpayService from './razorpay.service.js';
import crypto from 'crypto';

/**
 * Get all banner slots with current availability
 */
export const getBannerSlots = async () => {
  return await BannerSlot.find().populate({
    path: 'currentBooking',
    populate: { path: 'vendorId', select: 'businessName storeName' }
  }).sort({ slotNumber: 1 });
};

/**
 * Get banner settings (universal display time)
 */
export const getBannerSettings = async () => {
  const settings = await Settings.getSettings();
  return settings.banners || { universalDisplayTime: 2000 };
};

/**
 * Update banner settings
 */
export const updateBannerSettings = async (universalDisplayTime) => {
  const settings = await Settings.getSettings();
  settings.banners = { universalDisplayTime };
  await settings.save();
  return settings.banners;
};

/**
 * Check if a slot is available
 */
export const checkSlotAvailability = async (slotId) => {
  const slot = await BannerSlot.findById(slotId);
  if (!slot) throw new Error('Slot not found');
  
  // If slot has a current booking, check its status
  if (slot.currentBooking) {
    const booking = await BannerBooking.findById(slot.currentBooking);
    if (booking && (booking.status === 'active' || booking.status === 'pending')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Create a new banner booking
 */
export const createBooking = async (vendorId, bookingData, file) => {
  const { slotId, title, link, startDate, endDate, amount } = bookingData;
  
  const slot = await BannerSlot.findById(slotId);
  if (!slot) throw new Error('Slot not found');
  
  const isAvailable = await checkSlotAvailability(slotId);
  if (!isAvailable) throw new Error('Slot is already booked');

  let bannerImage = '';
  if (file) {
    const uploadResult = await uploadToCloudinary(file.buffer, 'hero-banners');
    bannerImage = uploadResult.secure_url;
  } else if (bookingData.bannerImage) {
    bannerImage = bookingData.bannerImage;
  } else {
    throw new Error('Banner image is required');
  }

  const referenceId = `HERO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const booking = await BannerBooking.create({
    vendorId,
    slotId,
    referenceId,
    bannerImage,
    title,
    link,
    startDate,
    endDate,
    amount,
    status: 'pending',
    paymentStatus: 'unpaid'
  });

  // Create Razorpay order
  let razorpayOrder = null;
  try {
    razorpayOrder = await razorpayService.createOrder(
      amount,
      'INR',
      referenceId,
      {
        bookingId: booking._id.toString(),
        vendorId: vendorId.toString(),
        type: 'hero_banner_booking'
      }
    );
  } catch (error) {
    console.warn('Razorpay order creation failed, but booking was saved:', error.message);
  }

  return {
    ...booking.toObject(),
    razorpayOrder
  };
};

/**
 * Confirm payment and activate booking
 */
export const confirmBookingPayment = async (bookingId, transactionId) => {
  const booking = await BannerBooking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  booking.paymentStatus = 'paid';
  booking.status = 'active';
  booking.paymentId = transactionId;
  await booking.save();

  // Update slot
  await BannerSlot.findByIdAndUpdate(booking.slotId, {
    currentBooking: booking._id
  });

  return booking;
};

/**
 * Get active banners for rotation
 */
export const getActiveBanners = async () => {
  const slots = await BannerSlot.find({ isActive: true })
    .populate({
      path: 'currentBooking',
      match: { status: 'active' }
    })
    .sort({ slotNumber: 1 });

  return slots
    .filter(slot => slot.currentBooking)
    .map(slot => ({
      id: slot.currentBooking._id,
      slotNumber: slot.slotNumber,
      image: slot.currentBooking.bannerImage,
      link: slot.currentBooking.link,
      title: slot.currentBooking.title
    }));
};

/**
 * Get vendor bookings
 */
export const getVendorBookings = async (vendorId) => {
  return await BannerBooking.find({ vendorId })
    .populate('slotId')
    .sort({ createdAt: -1 });
};

/**
 * Get all bookings (Admin)
 */
export const getAllBookings = async () => {
  return await BannerBooking.find()
    .populate('vendorId', 'businessName storeName email')
    .populate('slotId')
    .sort({ createdAt: -1 });
};

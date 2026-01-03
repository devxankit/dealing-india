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
 * Check if a slot is available for a given date range
 */
export const checkSlotAvailability = async (slotId, startDate, endDate) => {
  const slot = await BannerSlot.findById(slotId);
  if (!slot) throw new Error('Slot not found');
  
  const now = new Date();
  const requestedStart = new Date(startDate);
  const requestedEnd = new Date(endDate);
  
  // Check for overlapping bookings in this slot
  const overlappingBookings = await BannerBooking.find({
    slotId,
    status: { $in: ['pending', 'active'] },
    adminApprovalStatus: { $in: ['pending', 'approved'] },
    $or: [
      // Booking starts before requested end and ends after requested start
      {
        startDate: { $lte: requestedEnd },
        endDate: { $gte: requestedStart }
      }
    ]
  });
  
  if (overlappingBookings.length > 0) {
    return false;
  }
  
  return true;
};

/**
 * Create a new banner booking
 */
export const createBooking = async (vendorId, bookingData, file) => {
  // Validate required fields
  if (!bookingData.slotId) {
    throw new Error('Slot ID is required');
  }
  if (!bookingData.startDate) {
    throw new Error('Start date is required');
  }
  if (!bookingData.endDate) {
    throw new Error('End date is required');
  }
  if (!bookingData.amount && bookingData.amount !== 0) {
    throw new Error('Amount is required');
  }

  const { slotId, title, link, startDate, endDate, amount } = bookingData;
  
  // Convert dates to Date objects if they're strings
  const startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
  const endDateObj = endDate instanceof Date ? endDate : new Date(endDate);
  
  // Validate dates
  if (isNaN(startDateObj.getTime())) {
    throw new Error('Invalid start date format');
  }
  if (isNaN(endDateObj.getTime())) {
    throw new Error('Invalid end date format');
  }
  if (startDateObj >= endDateObj) {
    throw new Error('End date must be after start date');
  }
  
  // Convert amount to number
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    throw new Error('Invalid amount');
  }
  
  const slot = await BannerSlot.findById(slotId);
  if (!slot) throw new Error('Slot not found');
  
  const isAvailable = await checkSlotAvailability(slotId, startDateObj, endDateObj);
  if (!isAvailable) throw new Error('Slot is already booked for the selected date range');

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
    title: title || '',
    link: link || '/',
    startDate: startDateObj,
    endDate: endDateObj,
    amount: amountNum,
    status: 'pending',
    paymentStatus: 'unpaid'
  });

  // Create Razorpay order
  let razorpayOrder = null;
  try {
    razorpayOrder = await razorpayService.createOrder(
      amountNum,
      'INR',
      referenceId,
      {
        bookingId: booking._id.toString(),
        vendorId: vendorId.toString(),
        type: 'hero_banner_booking'
      }
    );
    
    // Store Razorpay order ID in booking
    if (razorpayOrder && razorpayOrder.id) {
      booking.razorpayOrderId = razorpayOrder.id;
      await booking.save();
    }
  } catch (error) {
    console.warn('Razorpay order creation failed, but booking was saved:', error.message);
  }

  // Get Razorpay key ID for frontend
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;

  return {
    ...booking.toObject(),
    razorpayOrder,
    razorpayKeyId
  };
};

/**
 * Confirm payment - booking remains pending until admin approval
 */
export const confirmBookingPayment = async (bookingId, paymentData, paymentMethod = 'razorpay') => {
  const booking = await BannerBooking.findById(bookingId).populate('vendorId', 'businessName storeName email');
  if (!booking) throw new Error('Booking not found');

  // paymentData can be:
  // - Object with razorpayPaymentId, razorpayOrderId, etc.
  // - String (legacy support for transactionId)
  const razorpayPaymentId = typeof paymentData === 'object' ? paymentData.razorpayPaymentId : null;
  const razorpayOrderId = typeof paymentData === 'object' ? paymentData.razorpayOrderId : null;
  const razorpaySignature = typeof paymentData === 'object' ? paymentData.razorpaySignature : null;

  booking.paymentStatus = 'paid';
  // Keep status as 'pending' until admin approves
  booking.status = 'pending';
  booking.paymentMethod = paymentMethod;
  
  // Store Razorpay payment details
  if (razorpayPaymentId) {
    booking.razorpayPaymentId = razorpayPaymentId;
  }
  if (razorpayOrderId) {
    booking.razorpayOrderId = razorpayOrderId;
  }
  
  // paymentId is optional (for Transaction reference if needed later)
  // Don't set it if we only have Razorpay payment ID
  booking.paymentId = null;
  
  await booking.save();

  // Don't update slot currentBooking yet - wait for admin approval
  return booking;
};

/**
 * Get active banners for rotation
 * Only returns banners that are: paid + approved + within date range
 */
export const getActiveBanners = async () => {
  const now = new Date();
  
  // Find all bookings that meet the criteria
  const activeBookings = await BannerBooking.find({
    paymentStatus: 'paid',
    adminApprovalStatus: 'approved',
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
    .populate('slotId')
    .sort({ 'slotId.slotNumber': 1 });

  return activeBookings.map(booking => ({
    id: booking._id,
    slotNumber: booking.slotId?.slotNumber || 0,
    image: booking.bannerImage,
    link: booking.link,
    title: booking.title
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

/**
 * Approve a banner booking
 */
export const approveBooking = async (bookingId) => {
  const booking = await BannerBooking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  if (booking.paymentStatus !== 'paid') {
    throw new Error('Cannot approve booking with unpaid status');
  }

  booking.adminApprovalStatus = 'approved';
  booking.status = 'active';
  await booking.save();

  // Update slot to reference this booking
  await BannerSlot.findByIdAndUpdate(booking.slotId, {
    currentBooking: booking._id
  });

  return booking;
};

/**
 * Reject a banner booking
 */
export const rejectBooking = async (bookingId, reason = '') => {
  const booking = await BannerBooking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  booking.adminApprovalStatus = 'rejected';
  booking.status = 'cancelled';
  booking.rejectionReason = reason;
  await booking.save();

  // Clear slot if this was the current booking
  const slot = await BannerSlot.findById(booking.slotId);
  if (slot && slot.currentBooking?.toString() === bookingId.toString()) {
    slot.currentBooking = null;
    await slot.save();
  }

  return booking;
};

/**
 * Get banner revenue statistics
 */
export const getBannerRevenueStats = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Total revenue from all paid bookings
  const totalRevenueResult = await BannerBooking.aggregate([
    {
      $match: {
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' }
      }
    }
  ]);

  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].totalRevenue : 0;

  // Revenue from last 30 days
  const last30DaysRevenueResult = await BannerBooking.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$amount' }
      }
    }
  ]);

  const last30DaysRevenue = last30DaysRevenueResult.length > 0 ? last30DaysRevenueResult[0].revenue : 0;

  // Revenue from previous 30 days (31-60 days ago) for comparison
  const previous30DaysRevenueResult = await BannerBooking.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: { 
          $gte: sixtyDaysAgo,
          $lt: thirtyDaysAgo
        }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$amount' }
      }
    }
  ]);

  const previous30DaysRevenue = previous30DaysRevenueResult.length > 0 ? previous30DaysRevenueResult[0].revenue : 0;

  // Calculate percentage change
  const percentageChange = previous30DaysRevenue > 0
    ? ((last30DaysRevenue - previous30DaysRevenue) / previous30DaysRevenue) * 100
    : last30DaysRevenue > 0 ? 100 : 0;

  // Active bookings count (paid + approved + within date range)
  const activeBookingsCount = await BannerBooking.countDocuments({
    paymentStatus: 'paid',
    adminApprovalStatus: 'approved',
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  });

  // Active bookings in last 30 days
  const activeBookingsLast30Days = await BannerBooking.countDocuments({
    paymentStatus: 'paid',
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Unique vendors count
  const uniqueVendorsResult = await BannerBooking.aggregate([
    {
      $match: {
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: '$vendorId'
      }
    },
    {
      $count: 'total'
    }
  ]);

  const uniqueVendorsCount = uniqueVendorsResult.length > 0 ? uniqueVendorsResult[0].total : 0;

  return {
    totalRevenue,
    last30DaysRevenue,
    previous30DaysRevenue,
    percentageChange: parseFloat(percentageChange.toFixed(1)),
    activeBookingsCount,
    activeBookingsLast30Days,
    uniqueVendorsCount
  };
};

/**
 * Get banner transactions for wallet page
 */
export const getBannerTransactions = async (searchTerm = '', limit = 50, skip = 0) => {
  const query = {
    paymentStatus: 'paid'
  };

  // Build search query
  if (searchTerm) {
    query.$or = [
      { referenceId: { $regex: searchTerm, $options: 'i' } },
      { title: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  const transactions = await BannerBooking.find(query)
    .populate('vendorId', 'businessName storeName email')
    .populate('slotId', 'slotNumber')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  // Transform to wallet transaction format
  const formattedTransactions = transactions.map(booking => ({
    id: booking.referenceId || `TXN-${booking._id.toString().slice(-6).toUpperCase()}`,
    transactionId: booking._id,
    date: booking.createdAt,
    amount: booking.amount,
    type: 'Hero Banner Booking',
    method: booking.paymentMethod || 'razorpay',
    status: booking.paymentStatus === 'paid' ? 'completed' : booking.paymentStatus,
    bookingId: booking.referenceId,
    direction: 'in',
    vendor: booking.vendorId?.businessName || booking.vendorId?.storeName || 'Unknown Vendor',
    vendorId: booking.vendorId?._id,
    slotNumber: booking.slotId?.slotNumber,
    bannerImage: booking.bannerImage,
    title: booking.title,
    startDate: booking.startDate,
    endDate: booking.endDate
  }));

  const total = await BannerBooking.countDocuments(query);

  return {
    transactions: formattedTransactions,
    total,
    limit,
    skip
  };
};

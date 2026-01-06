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
 * Get banner settings (universal display time, pricing, duration, booking window)
 */
export const getBannerSettings = async () => {
  const settings = await Settings.getSettings();
  const bannerSettings = settings.banners || {};

  // Ensure defaults are set
  return {
    universalDisplayTime: bannerSettings.universalDisplayTime || 2000,
    bookingWindowDays: bannerSettings.bookingWindowDays || 30,
    defaultPricePerDay: bannerSettings.defaultPricePerDay || 1999,
    minDurationHours: bannerSettings.minDurationHours || 24,
    maxDurationHours: bannerSettings.maxDurationHours || 720,
    pricingStructure: bannerSettings.pricingStructure || {
      '24': 1999,
      '168': 13000,
      '720': 50000
    }
  };
};

/**
 * Update banner settings with audit logging
 */
export const updateBannerSettings = async (settingsData, adminId) => {
  const settings = await Settings.getSettings();
  const oldBannerSettings = JSON.parse(JSON.stringify(settings.banners || {}));

  // Update banner settings
  if (!settings.banners) {
    settings.banners = {};
  }

  const changes = {};

  if (settingsData.universalDisplayTime !== undefined) {
    settings.banners.universalDisplayTime = settingsData.universalDisplayTime;
    changes.universalDisplayTime = { from: oldBannerSettings.universalDisplayTime, to: settingsData.universalDisplayTime };
  }

  if (settingsData.bookingWindowDays !== undefined) {
    if (settingsData.bookingWindowDays < 1 || settingsData.bookingWindowDays > 365) {
      throw new Error('Booking window must be between 1 and 365 days');
    }
    settings.banners.bookingWindowDays = settingsData.bookingWindowDays;
    changes.bookingWindowDays = { from: oldBannerSettings.bookingWindowDays, to: settingsData.bookingWindowDays };
  }

  if (settingsData.defaultPricePerDay !== undefined) {
    if (settingsData.defaultPricePerDay < 0) {
      throw new Error('Default price per day cannot be negative');
    }
    settings.banners.defaultPricePerDay = settingsData.defaultPricePerDay;
    changes.defaultPricePerDay = { from: oldBannerSettings.defaultPricePerDay, to: settingsData.defaultPricePerDay };
  }

  if (settingsData.minDurationHours !== undefined) {
    if (settingsData.minDurationHours < 1) {
      throw new Error('Minimum duration must be at least 1 hour');
    }
    settings.banners.minDurationHours = settingsData.minDurationHours;
    changes.minDurationHours = { from: oldBannerSettings.minDurationHours, to: settingsData.minDurationHours };
  }

  if (settingsData.maxDurationHours !== undefined) {
    if (settingsData.maxDurationHours < 1) {
      throw new Error('Maximum duration must be at least 1 hour');
    }
    if (settingsData.maxDurationHours < (settings.banners.minDurationHours || 1)) {
      throw new Error('Maximum duration must be greater than or equal to minimum duration');
    }
    settings.banners.maxDurationHours = settingsData.maxDurationHours;
    changes.maxDurationHours = { from: oldBannerSettings.maxDurationHours, to: settingsData.maxDurationHours };
  }

  if (settingsData.pricingStructure !== undefined) {
    settings.banners.pricingStructure = settingsData.pricingStructure;
    changes.pricingStructure = { from: oldBannerSettings.pricingStructure, to: settingsData.pricingStructure };
  }

  // Add audit log if there are changes and adminId is provided
  if (Object.keys(changes).length > 0 && adminId) {
    if (!settings.banners.auditLogs) {
      settings.banners.auditLogs = [];
    }
    settings.banners.auditLogs.push({
      action: 'UPDATE_BANNER_SETTINGS',
      performedBy: adminId,
      changes: changes,
      timestamp: new Date()
    });

    // Keep only last 100 audit logs
    if (settings.banners.auditLogs.length > 100) {
      settings.banners.auditLogs = settings.banners.auditLogs.slice(-100);
    }
  }

  await settings.save();
  return settings.banners;
};

/**
 * Calculate price based on duration in days
 */
export const calculatePrice = async (duration, slotId) => {
  const settings = await getBannerSettings();
  let pricingStructure = settings.pricingStructure || {};
  let slotPricePerDay = settings.defaultPricePerDay || 1999;

  const defaultPrice = settings.defaultPricePerDay || 1999;
  let priceMultiplier = 1;
  let hasSlotSpecificStructure = false;

  if (slotId) {
    const slot = await BannerSlot.findById(slotId);
    if (slot) {
      slotPricePerDay = slot.price;

      if (slot.pricingStructure && slot.pricingStructure.size > 0) {
        // Convert Mongoose Map to Object
        const slotStructure = {};
        for (const [key, value] of slot.pricingStructure) {
          slotStructure[key] = value;
        }

        if (Object.keys(slotStructure).length > 0) {
          pricingStructure = slotStructure;
          hasSlotSpecificStructure = true;
        }
      }
    }
  }

  // Calculate multiplier ONLY if using global structure
  if (!hasSlotSpecificStructure) {
    priceMultiplier = defaultPrice > 0 ? slotPricePerDay / defaultPrice : 1;
  }

  // Treat input as days if it seems small (< 24), but also handle if someone passes hours?
  // User request: "One day... counted as 12.00 am... charged 100%"
  // We should interpret `duration` as "Number of Calendar Days" (1, 2, 3...)
  // But wait, frontend currently sends hours (24, 48).
  // I need to support both or standardize.
  // Ideally, I convert everything to "Days".

  let durationDays = duration;
  if (duration >= 24) {
    // Assuming existing frontend sends 24 for 1 day
    durationDays = duration / 24;
  }
  // Ensure at least 1 day charged
  durationDays = Math.max(1, Math.ceil(durationDays));


  // Convert durationDays to hour key for lookup (since structure is '24', '168')
  // This maintains compatibility with existing structure keys
  const durationHoursKey = (durationDays * 24).toString();

  // If exact match exists in pricing structure (e.g. '24', '168')
  if (pricingStructure[durationHoursKey] !== undefined) {
    return Math.round(pricingStructure[durationHoursKey] * priceMultiplier);
  }

  // Find the closest lower bound in pricing structure
  const sortedDurations = Object.keys(pricingStructure)
    .map(Number)
    .sort((a, b) => a - b);

  let basePrice = hasSlotSpecificStructure ? slotPricePerDay : defaultPrice;
  let baseHours = 24;

  // Find the highest duration key that is <= our duration (in hours)
  // We use hours for lookup compatibility
  const totalDurationHours = durationDays * 24;

  for (let i = sortedDurations.length - 1; i >= 0; i--) {
    if (sortedDurations[i] <= totalDurationHours) {
      baseHours = sortedDurations[i];
      basePrice = pricingStructure[baseHours.toString()];
      break;
    }
  }

  // If match found and using global structure, apply specific base price logic
  if (baseHours === 24 && !pricingStructure['24']) {
    basePrice = hasSlotSpecificStructure ? slotPricePerDay : defaultPrice;
  }

  // Base Price is for `baseHours` (e.g. 24 hours = 1 day).
  // We want Price Per Day.
  const baseDays = baseHours / 24;
  const pricePerDay = basePrice / baseDays;

  const finalPrice = pricePerDay * durationDays;

  return Math.round(finalPrice * priceMultiplier);
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
    // Only paid bookings should block the slot
    // (or approved ones, though approved usually implies paid)
    paymentStatus: 'paid',
    status: { $in: ['pending', 'active'] },
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
  if (!bookingData.durationHours && !bookingData.durationDays) {
    throw new Error('Duration is required');
  }

  const { slotId, title, link, startDate, durationHours } = bookingData;

  // Get banner settings
  const settings = await getBannerSettings();

  // Validate duration
  // Accepted inputs: durationHours (legacy, usually 24, 48...) OR durationDays (new)

  let durationDays = bookingData.durationDays;
  if (!durationDays && durationHours) {
    // Legacy fallback
    durationDays = parseFloat(durationHours) / 24;
  }

  if (!durationDays || isNaN(durationDays) || durationDays < 0.1) { // 0.1 safety check
    throw new Error('Valid duration in days is required');
  }

  // Enforce min/max days (converting settings hours to days)
  const minDays = (settings.minDurationHours || 24) / 24;
  const maxDays = (settings.maxDurationHours || 720) / 24;

  if (durationDays < minDays) {
    // Allow if it's explicitly "1 day" even if min is technically 24 hours
    // But consistency is better. Let's just warn if strict. 
    // For now, auto-correct 0 to 1? No, error.
    throw new Error(`Minimum duration is ${minDays} day(s)`);
  }
  if (durationDays > maxDays) {
    throw new Error(`Maximum duration is ${maxDays} days`);
  }


  // Convert start date to Date object
  const startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    throw new Error('Invalid start date format');
  }

  // Calculate End Date:
  // "visible only till night 12.am"
  // Logic: 
  // Start Date: Jan 6, 3:00 PM
  // Duration: 1 Day
  // End Date: Jan 6 (Today) Midnight -> Jan 7, 00:00 AM.
  //
  // Start Date: Jan 6, 3:00 PM
  // Duration: 2 Days
  // End Date: Jan 7 (Tomorrow) Midnight -> Jan 8, 00:00 AM.

  // We take the Start Date, Add (DurationDays - 1) Days, then set to End of that day (which is next midnight)
  // Actually simpler: 
  // 1 Day = Remainder of Today.
  // End Date = StartDate (Date Part) + 1 Day (at 00:00:00)

  const tempDate = new Date(startDateObj);
  // Add durationDays (integer part mostly, but let's assume integers for "days")
  const fullDays = Math.ceil(durationDays);

  tempDate.setDate(tempDate.getDate() + fullDays);
  tempDate.setHours(0, 0, 0, 0); // Set to Midnight of that target date

  const endDateObj = tempDate;

  // Calculate price based on durationDays (passing as days to our updated function)
  const amountNum = await calculatePrice(durationDays, slotId);

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


  // CLEANUP: Delete any existing unpaid bookings for this slot/vendor to prevent clutter/conflicts
  // This allows the user to "retry" without manually cancelling the old one
  await BannerBooking.deleteMany({
    vendorId,
    slotId,
    paymentStatus: 'unpaid',
    status: 'pending',
    startDate: startDateObj // Optional: matching exact date
  });

  const referenceId = `HERO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const booking = await BannerBooking.create({
    vendorId,
    slotId,
    referenceId,
    bannerImage,
    title: title || '',
    link: link || '/',
    startDate: startDateObj,
    endDate: endDateObj,
    durationHours: durationDays * 24, // Store as hours for compatibility if Schema requires? 
    // Wait, Schema might strict check? Schema usually just Number.
    // "durationHours" field name implies hours. Storing 24 for 1 day is safer for legacy read.
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
    .populate('vendorId', '_id businessName storeName') // Populate vendor info
    .sort({ 'slotId.slotNumber': 1 });

  return activeBookings.map(booking => ({
    id: booking._id,
    slotNumber: booking.slotId?.slotNumber || 0,
    image: booking.bannerImage,
    link: booking.link,
    title: booking.title,
    vendorId: booking.vendorId?._id, // Return vendor ID
    vendorName: booking.vendorId?.businessName || booking.vendorId?.storeName // Return vendor name
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
 * Get specific vendor booking
 */
export const getVendorBookingById = async (bookingId, vendorId) => {
  return await BannerBooking.findOne({ _id: bookingId, vendorId })
    .populate('slotId');
};

/**
 * Get booking by ID (Admin)
 */
export const getBookingById = async (bookingId) => {
  return await BannerBooking.findById(bookingId)
    .populate('vendorId', 'businessName storeName email phone')
    .populate('slotId');
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
 * Update a banner slot details (price, pricing structure)
 */
export const updateSlot = async (slotId, slotData) => {
  const slot = await BannerSlot.findById(slotId);
  if (!slot) {
    throw new Error('Slot not found');
  }

  if (slotData.price !== undefined) {
    if (slotData.price < 0) throw new Error('Price cannot be negative');
    slot.price = slotData.price;
  }

  if (slotData.pricingStructure !== undefined) {
    // If null/empty object passed, we might assume clearing it?
    // Let's assume standard object passed
    slot.pricingStructure = slotData.pricingStructure;
  }

  return await slot.save();
};
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

/**
 * Delete an unpaid booking (used when user cancels payment)
 */
export const deleteUnpaidBooking = async (bookingId, vendorId) => {
  const booking = await BannerBooking.findOne({ _id: bookingId, vendorId });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Only allow deleting appointments that are strictly unpaid
  // If payment failed, we might want to keep it (as per user request), 
  // but usually "unpaid" covers both "not attempted" and "failed but didn't update status".
  // If we want to strictly keep "failed" records, we'd need a separate status for that.
  // For now, assuming "unpaid" means "abandoned flow".
  if (booking.paymentStatus === 'paid') {
    throw new Error('Cannot delete a paid booking');
  }

  await BannerBooking.findByIdAndDelete(bookingId);
  return true;
};

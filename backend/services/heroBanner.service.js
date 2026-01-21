import BannerSlot from '../models/BannerSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Settings from '../models/Settings.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import razorpayService from './razorpay.service.js';
import vendorWalletService from './vendorWallet.service.js';
import crypto from 'crypto';

/**
 * Get all banner slots with current availability
 * @param {String} bannerType - 'hero' or 'b2b', optional (returns all if not provided)
 */
export const getBannerSlots = async (bannerType = null) => {
  // First, update existing slots without bannerType to 'hero' (one-time migration)
  const slotsWithoutType = await BannerSlot.countDocuments({
    $or: [
      { bannerType: { $exists: false } },
      { bannerType: null }
    ]
  });

  if (slotsWithoutType > 0) {
    console.log(`🔄 Migrating ${slotsWithoutType} slots without bannerType to 'hero'...`);
    const updateResult = await BannerSlot.updateMany(
      {
        $or: [
          { bannerType: { $exists: false } },
          { bannerType: null }
        ]
      },
      { $set: { bannerType: 'hero' } }
    );
    console.log(`✅ Migrated ${updateResult.modifiedCount} slots to 'hero' type`);
  }

  // Initialize B2B slots if they don't exist
  if (bannerType === 'b2b') {
    // Check how many B2B slots exist
    const existingB2BSlotsCount = await BannerSlot.countDocuments({ bannerType: 'b2b' });
    console.log(`🔍 Checking B2B slots: Found ${existingB2BSlotsCount} existing slots`);

    if (existingB2BSlotsCount === 0) {
      console.log(`🔄 Initializing B2B slots...`);
      const defaultB2BSlots = [
        { slotNumber: 1, bannerType: 'b2b', price: 2999, isActive: true },
        { slotNumber: 2, bannerType: 'b2b', price: 2799, isActive: true },
        { slotNumber: 3, bannerType: 'b2b', price: 2499, isActive: true },
        { slotNumber: 4, bannerType: 'b2b', price: 2299, isActive: true },
        { slotNumber: 5, bannerType: 'b2b', price: 1999, isActive: true },
        { slotNumber: 6, bannerType: 'b2b', price: 1799, isActive: true },
        { slotNumber: 7, bannerType: 'b2b', price: 1499, isActive: true },
        { slotNumber: 8, bannerType: 'b2b', price: 1299, isActive: true },
        { slotNumber: 9, bannerType: 'b2b', price: 1199, isActive: true },
        { slotNumber: 10, bannerType: 'b2b', price: 999, isActive: true },
      ];

      // Try bulk insert first (faster and handles duplicates better)
      try {
        const insertResult = await BannerSlot.insertMany(defaultB2BSlots, {
          ordered: false // Continue inserting even if some fail
        });
        console.log(`✅ Created ${insertResult.length} B2B slots via bulk insert`);
      } catch (bulkError) {
        // If bulk insert fails, it means some slots already exist
        // Handle individual inserts
        console.log(`🔄 Bulk insert partially failed, trying individual inserts...`);

        let createdCount = 0;
        for (const slotData of defaultB2BSlots) {
          try {
            // Use findOneAndUpdate with upsert for better handling
            const result = await BannerSlot.findOneAndUpdate(
              {
                slotNumber: slotData.slotNumber,
                bannerType: 'b2b'
              },
              {
                $setOnInsert: slotData // Only set on insert, don't update existing
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
              }
            );

            // Check if it was created (upserted) or already existed
            const wasCreated = result.createdAt &&
              result.createdAt.getTime() === result.updatedAt.getTime();

            if (wasCreated) {
              createdCount++;
              console.log(`✅ Created B2B slot ${slotData.slotNumber} (₹${slotData.price})`);
            } else {
              console.log(`⏭️  B2B slot ${slotData.slotNumber} already exists`);
            }
          } catch (error) {
            // Try to find if slot exists despite error
            const existingSlot = await BannerSlot.findOne({
              slotNumber: slotData.slotNumber,
              bannerType: 'b2b'
            });

            if (existingSlot) {
              console.log(`✅ B2B slot ${slotData.slotNumber} already exists (found after error)`);
            } else {
              // Duplicate key error means old index conflict - log and continue
              if (error.code === 11000) {
                console.log(`⚠️  B2B slot ${slotData.slotNumber} - old index conflict (slotNumber_1), skipping...`);
              } else {
                console.error(`❌ Error creating B2B slot ${slotData.slotNumber}:`, error.message);
                // Don't throw - continue with other slots
              }
            }
          }
        }
        console.log(`✅ Processed B2B slots (${createdCount} newly created)`);
      }
    } else {
      console.log(`✅ B2B slots already exist (${existingB2BSlotsCount} slots)`);
    }

    // Always fetch the B2B slots after potential initialization
    const slots = await BannerSlot.find({ bannerType: 'b2b' }).populate({
      path: 'currentBooking',
      populate: { path: 'vendorId', select: 'name storeName vendorType' }
    }).sort({ slotNumber: 1 });

    console.log(`📊 Loaded ${slots.length} B2B banner slots`);
    return slots;
  }

  // Handle hero banners and other cases
  const query = {};
  if (bannerType) {
    // Handle backward compatibility: if bannerType is 'hero', also include documents
    // where bannerType is missing or null (since default is 'hero')
    if (bannerType === 'hero') {
      query.$or = [
        { bannerType: 'hero' },
        { bannerType: { $exists: false } },
        { bannerType: null }
      ];
    } else {
      query.bannerType = bannerType;
    }
  }

  const slots = await BannerSlot.find(query).populate({
    path: 'currentBooking',
    populate: { path: 'vendorId', select: 'name storeName vendorType' }
  }).sort({ slotNumber: 1 });

  return slots;
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
 * @param {String} vendorId - Vendor ID
 * @param {Object} bookingData - Booking data
 * @param {File} file - Banner image file
 * @param {String} paymentMethod - Payment method ('razorpay' or 'wallet'), default 'razorpay'
 */
export const createBooking = async (vendorId, bookingData, file, paymentMethod = 'razorpay') => {
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
  // Handle date-only strings (YYYY-MM-DD) by treating them as UTC midnight
  // This ensures the selected date is stored correctly without timezone shifts
  let startDateObj;
  if (startDate instanceof Date) {
    startDateObj = startDate;
  } else if (typeof startDate === 'string' && startDate.trim()) {
    const dateStr = startDate.trim();

    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Date-only format: treat as UTC midnight to preserve the selected date
      // Example: "2026-01-21" -> "2026-01-21T00:00:00.000Z"
      startDateObj = new Date(`${dateStr}T00:00:00.000Z`);
      console.log(`📅 Date-only string detected: "${dateStr}" -> UTC: ${startDateObj.toISOString()}`);
    } else if (dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.includes('T') && dateStr.includes('-'))) {
      // ISO string with timezone info - parse directly
      startDateObj = new Date(dateStr);
      console.log(`📅 ISO string with timezone: "${dateStr}" -> ${startDateObj.toISOString()}`);
    } else {
      // Other formats - try to parse, but log warning
      startDateObj = new Date(dateStr);
      console.warn(`⚠️ Unrecognized date format: "${dateStr}", parsed as: ${startDateObj.toISOString()}`);
    }
  } else {
    // Date object or other type
    startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
  }

  if (isNaN(startDateObj.getTime())) {
    throw new Error(`Invalid start date format: ${startDate}`);
  }

  console.log(`📅 Final startDateObj: ${startDateObj.toISOString()} (UTC)`);

  // Calculate End Date:
  // Requirement: banner always ends at 23:59:59 of the last day.
  // Example:
  // Start Date: Jan 21 (any time), Duration: 1 Day
  // End Date: Jan 21, 23:59:59
  //
  // Start Date: Jan 21, Duration: 2 Days
  // End Date: Jan 22, 23:59:59

  const tempDate = new Date(startDateObj);
  const fullDays = Math.ceil(durationDays);
  // Add (fullDays - 1) days and set to end of day (UTC)
  tempDate.setUTCDate(tempDate.getUTCDate() + fullDays - 1);
  tempDate.setUTCHours(23, 59, 59, 999);

  const endDateObj = tempDate;

  // Calculate price based on durationDays (passing as days to our updated function)
  const amountNum = await calculatePrice(durationDays, slotId);

  const slot = await BannerSlot.findById(slotId);
  if (!slot) throw new Error('Slot not found');

  // Determine banner type from vendor or slot
  let bannerType = bookingData.bannerType;
  if (!bannerType) {
    // Check vendor type to determine banner type
    const Vendor = (await import('../models/Vendor.model.js')).default;
    const vendor = await Vendor.findById(vendorId);
    if (vendor && vendor.vendorType === 'b2b') {
      bannerType = 'b2b';
    } else {
      bannerType = 'hero';
    }
  }

  // Verify slot matches banner type (if slot has bannerType set)
  if (slot.bannerType && slot.bannerType !== bannerType) {
    throw new Error(`Slot type mismatch. This slot is for ${slot.bannerType} banners.`);
  }

  // If slot doesn't have bannerType, set it based on booking
  if (!slot.bannerType) {
    slot.bannerType = bannerType;
    await slot.save();
  }

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
    paymentStatus: 'unpaid',
    paymentMethod: paymentMethod || 'razorpay',
    bannerType: bannerType
  });

  // Handle wallet payment
  if (paymentMethod === 'wallet' && vendorId) {
    try {
      // Check vendor wallet balance
      const wallet = await vendorWalletService.getOrCreateWallet(vendorId);

      if (wallet.balance < amountNum) {
        // Delete the booking if wallet payment fails
        await BannerBooking.findByIdAndDelete(booking._id);
        throw new Error('Insufficient wallet balance');
      }

      // Deduct from wallet
      await vendorWalletService.debitPendingOrBalance(
        vendorId,
        amountNum,
        `Banner Booking Payment - ${referenceId}`,
        booking._id.toString(),
        'banner_booking'
      );

      // Get the latest wallet transaction for this booking
      const VendorWalletTransaction = (await import('../models/VendorWalletTransaction.model.js')).default;
      const walletTransaction = await VendorWalletTransaction.findOne({
        vendorId,
        referenceId: booking._id.toString(),
        referenceType: 'banner_booking'
      }).sort({ createdAt: -1 });

      // Update booking payment status
      booking.paymentStatus = 'paid';
      booking.paymentMethod = 'wallet';
      // Store wallet transaction ID if available (paymentId is for Transaction model, but we can store wallet transaction _id as string)
      if (walletTransaction) {
        // Note: paymentId field references 'Transaction' model, but for wallet payments we store the wallet transaction ID
        // This is acceptable as the reference is stored and we can query by it
        booking.paymentId = walletTransaction._id;
      }
      await booking.save();

      // Get Razorpay key ID for frontend (null for wallet payment)
      const razorpayKeyId = null;

      return {
        ...booking.toObject(),
        razorpayOrder: null,
        razorpayKeyId,
        walletTransactionId: walletResult._id
      };
    } catch (error) {
      // If wallet payment fails, delete the booking
      await BannerBooking.findByIdAndDelete(booking._id);
      throw error;
    }
  }

  // Create Razorpay order (for non-wallet payments)
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
  const booking = await BannerBooking.findById(bookingId).populate('vendorId', 'name storeName email');
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
 * @param {String} bannerType - Optional: 'hero' or 'b2b' to filter by type
 */
export const getActiveBanners = async (bannerType = 'hero') => {
  const now = new Date();

  // Default to 'hero' if bannerType is null, undefined, or empty string
  // This ensures we never return "mixed" results to the frontend
  const filterType = bannerType || 'hero';

  // For date comparison, we need to be precise
  // A banner is active if:
  // - startDate <= now (banner has started)
  // - endDate > now (banner hasn't ended yet)
  // Note: endDate is set to midnight (00:00:00) of the day AFTER the last display day
  // So if endDate is Jan 20 00:00:00, banner should show until Jan 19 23:59:59
  //
  // IMPORTANT: Some old banners might have incorrect endDate (calculated as startDate + 24 hours)
  // We'll handle this by checking if the banner's date range makes sense

  // Build query
  // Get start of yesterday (00:00:00) to include banners that ended yesterday
  // This handles cases where old banners have incorrect endDate calculation
  const startOfYesterday = new Date(now);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);

  const query = {
    paymentStatus: 'paid',
    adminApprovalStatus: 'approved',
    status: 'active',
    startDate: { $lte: now },
    // Include banners that ended yesterday or later
    // This is lenient to handle old banners with incorrect endDate
    // We'll do stricter filtering in JavaScript after fetching
    endDate: { $gte: startOfYesterday }
  };

  // Note: We don't filter by bannerType in the initial query
  // because we need to check both booking.bannerType AND slot.bannerType
  // (for old bookings that might not have bannerType set)
  // We'll filter after population

  console.log(`🔍 getActiveBanners(${filterType}): Query:`, JSON.stringify(query, null, 2));
  console.log(`🔍 Current time:`, now.toISOString());

  // First, let's check all bookings without vendor filter to see what we have
  const allMatchingBookings = await BannerBooking.find(query).lean();
  console.log(`📊 Found ${allMatchingBookings.length} bookings matching base criteria (before vendor filter)`);

  if (allMatchingBookings.length > 0) {
    console.log(`📋 Sample bookings:`, allMatchingBookings.slice(0, 3).map(b => ({
      _id: b._id,
      referenceId: b.referenceId,
      bannerType: b.bannerType,
      vendorId: b.vendorId,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      paymentStatus: b.paymentStatus,
      adminApprovalStatus: b.adminApprovalStatus
    })));
  }

  // Find all bookings that meet the criteria
  const activeBookings = await BannerBooking.find(query)
    .populate('slotId')
    .populate({
      path: 'vendorId',
      match: { isActive: true, status: 'approved' }, // Only active and approved vendors
      select: '_id name storeName vendorType isActive status'
    })
    .sort({ 'slotId.slotNumber': 1 })
    .lean();

  console.log(`📊 getActiveBanners(${filterType}): Found ${activeBookings.length} bookings after vendor population`);

  // Log details about each booking
  activeBookings.forEach((booking, index) => {
    console.log(`📋 Booking ${index + 1}:`, {
      _id: booking._id,
      referenceId: booking.referenceId,
      bookingBannerType: booking.bannerType,
      slotBannerType: booking.slotId?.bannerType,
      vendorId: booking.vendorId?._id || booking.vendorId,
      vendorType: booking.vendorId?.vendorType,
      vendorActive: booking.vendorId?.isActive,
      vendorStatus: booking.vendorId?.status,
      hasVendor: !!booking.vendorId,
      startDate: booking.startDate,
      endDate: booking.endDate
    });
  });

  const filteredBookings = activeBookings.filter(booking => {
    // Only include banners from active and approved vendors
    if (!booking.vendorId) {
      console.log(`⚠️ Skipping banner ${booking._id} (${booking.referenceId}) - vendor not found or inactive`);
      return false;
    }

    // Check if banner is still within valid date range
    // Handle both new format (endDate at midnight of next day) and old format (endDate = startDate + 24h)
    const endDate = new Date(booking.endDate);
    const startDate = new Date(booking.startDate);

    // Get date-only values (ignoring time) for comparison
    const endDateOnly = new Date(endDate);
    endDateOnly.setHours(0, 0, 0, 0);
    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);
    const yesterdayDateOnly = new Date(nowDateOnly);
    yesterdayDateOnly.setDate(yesterdayDateOnly.getDate() - 1);

    // Check if banner has expired
    // Allow banners that:
    // 1. End in the future (endDate > now) - normal case
    // 2. End today (endDateOnly === nowDateOnly) - banner is still valid today
    // 3. Ended yesterday but endDate is close to now (within 24 hours) - handle old format
    if (endDate <= now) {
      // Banner has ended, check if we should still show it
      if (endDateOnly.getTime() === nowDateOnly.getTime()) {
        // Banner ended today - allow it (it's still the same calendar day)
        console.log(`ℹ️ Banner ${booking._id} (${booking.referenceId}) ended today, allowing it`);
      } else if (endDateOnly.getTime() === yesterdayDateOnly.getTime()) {
        // Banner ended yesterday - check if it's within 24 hours
        const hoursSinceEnd = (now - endDate) / (1000 * 60 * 60);
        if (hoursSinceEnd <= 24) {
          // Ended within last 24 hours, allow it (handles old format where endDate was calculated incorrectly)
          console.log(`ℹ️ Banner ${booking._id} (${booking.referenceId}) ended yesterday (${hoursSinceEnd.toFixed(1)}h ago), allowing it (old format compatibility)`);
        } else {
          console.log(`⚠️ Skipping banner ${booking._id} (${booking.referenceId}) - endDate (${endDate.toISOString()}) has passed (${hoursSinceEnd.toFixed(1)}h ago)`);
          return false;
        }
      } else {
        // Banner ended more than 1 day ago - skip it
        console.log(`⚠️ Skipping banner ${booking._id} (${booking.referenceId}) - endDate (${endDate.toISOString()}) has passed`);
        return false;
      }
    }

    // Determine the effective bannerType (use booking's bannerType, fallback to slot's)
    const effectiveBannerType = booking.bannerType || booking.slotId?.bannerType || 'hero';

    // For B2B banners, ensure bannerType matches
    if (filterType === 'b2b') {
      if (effectiveBannerType !== 'b2b') {
        console.log(`⚠️ Skipping banner ${booking._id} (${booking.referenceId}) - bannerType is '${effectiveBannerType}', expected 'b2b'`);
        return false;
      }
      // Also ensure vendor is B2B type
      if (booking.vendorId.vendorType !== 'b2b') {
        console.log(`⚠️ Skipping banner ${booking._id} (${booking.referenceId}) - vendor is not B2B type (${booking.vendorId.vendorType})`);
        return false;
      }
    }

    // For hero banners, ensure bannerType matches (if filter is set)
    if (filterType === 'hero' && effectiveBannerType !== 'hero') {
      console.log(`⚠️ Skipping banner ${booking._id} (${booking.referenceId}) - bannerType is '${effectiveBannerType}', expected 'hero'`);
      return false;
    }

    return true;
  });

  console.log(`✅ Returning ${filteredBookings.length} active ${filterType} banners`);

  return filteredBookings.map(booking => ({
    _id: booking._id,
    id: booking._id.toString(), // Also provide id as string for compatibility
    slotNumber: booking.slotId?.slotNumber || 0,
    image: booking.bannerImage,
    bannerImage: booking.bannerImage, // Provide both field names
    link: booking.link || booking.redirectUrl,
    redirectUrl: booking.redirectUrl,
    title: booking.title,
    vendorId: booking.vendorId?._id || booking.vendorId,
    vendorName: booking.vendorId?.storeName || booking.vendorId?.name,
    startDate: booking.startDate,
    endDate: booking.endDate
  }));
};


/**
 * Get vendor bookings
 * @param {String} vendorId - Vendor ID
 * @param {String} bannerType - Optional: 'hero' or 'b2b' to filter by type
 */
export const getVendorBookings = async (vendorId, bannerType = null) => {
  const query = { vendorId };
  if (bannerType) {
    query.bannerType = bannerType;
  }
  return await BannerBooking.find(query)
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
    .populate('vendorId', 'name storeName email phone')
    .populate('slotId');
};

/**
 * Get all bookings (Admin)
 * @param {String} bannerType - Optional: 'hero' or 'b2b' to filter by type
 */
export const getAllBookings = async (bannerType = null) => {
  const query = {};
  if (bannerType) {
    query.bannerType = bannerType;
  }
  return await BannerBooking.find(query)
    .populate('vendorId', 'name storeName email vendorType')
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
 * @param {String} bannerType - Optional: 'hero' or 'b2b' to filter by type
 */
export const getBannerRevenueStats = async (bannerType = null) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Build match query with banner type filter
  const baseMatch = { paymentStatus: 'paid' };
  if (bannerType) {
    baseMatch.bannerType = bannerType;
  }

  // Total revenue from all paid bookings
  const totalRevenueResult = await BannerBooking.aggregate([
    {
      $match: baseMatch
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
  const last30DaysMatch = { ...baseMatch, createdAt: { $gte: thirtyDaysAgo } };
  const last30DaysRevenueResult = await BannerBooking.aggregate([
    {
      $match: last30DaysMatch
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
  const previous30DaysMatch = {
    ...baseMatch,
    createdAt: {
      $gte: sixtyDaysAgo,
      $lt: thirtyDaysAgo
    }
  };
  const previous30DaysRevenueResult = await BannerBooking.aggregate([
    {
      $match: previous30DaysMatch
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
  const activeBookingsMatch = {
    ...baseMatch,
    adminApprovalStatus: 'approved',
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  };
  const activeBookingsCount = await BannerBooking.countDocuments(activeBookingsMatch);

  // Active bookings in last 30 days
  const activeBookingsLast30Days = await BannerBooking.countDocuments(last30DaysMatch);

  // Unique vendors count
  const uniqueVendorsResult = await BannerBooking.aggregate([
    {
      $match: baseMatch
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

  // Total paid bookings count
  const totalPaidBookingsCount = await BannerBooking.countDocuments(baseMatch);

  return {
    totalRevenue,
    last30DaysRevenue,
    previous30DaysRevenue,
    percentageChange: parseFloat(percentageChange.toFixed(1)),
    activeBookingsCount,
    activeBookingsLast30Days,
    uniqueVendorsCount,
    totalPaidBookings: totalPaidBookingsCount
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
export const getBannerTransactions = async (searchTerm = '', limit = 50, skip = 0, bannerType = null) => {
  const query = {
    paymentStatus: 'paid'
  };

  // Filter by banner type if provided
  if (bannerType) {
    query.bannerType = bannerType;
  }

  // Build search query
  if (searchTerm) {
    query.$or = [
      { referenceId: { $regex: searchTerm, $options: 'i' } },
      { title: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  const transactions = await BannerBooking.find(query)
    .populate('vendorId', 'name storeName email vendorType')
    .populate('slotId', 'slotNumber bannerType')
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
    type: booking.bannerType === 'b2b' ? 'B2B Banner Booking' : 'Hero Banner Booking',
    bannerType: booking.bannerType || 'hero',
    method: booking.paymentMethod || 'razorpay',
    status: booking.paymentStatus === 'paid' ? 'completed' : booking.paymentStatus,
    bookingId: booking.referenceId,
    direction: 'in',
    vendor: booking.vendorId?.storeName || booking.vendorId?.name || 'Unknown Vendor',
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

import BannerSlot from '../models/BannerSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Vendor from '../models/Vendor.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// ==========================================
// VENDOR CONTROLLERS
// ==========================================

export const getAvailableSlots = asyncHandler(async (req, res) => {
    const { bannerType = 'hero' } = req.query;

    // Auto-create B2B slots if they don't exist
    if (bannerType === 'b2b') {
        const count = await BannerSlot.countDocuments({ bannerType: 'b2b' });
        if (count === 0) {
            const defaultSlots = Array.from({ length: 5 }, (_, i) => ({
                slotNumber: i + 1,
                bannerType: 'b2b',
                price: 2999 - (i * 200),
                isActive: true
            }));
            await BannerSlot.insertMany(defaultSlots);
        }
    }

    const slots = await BannerSlot.find({ bannerType, isActive: true }).lean().sort({ slotNumber: 1 });
    const now = new Date();

    // Dynamically find most relevant booking for each slot (active or nearest upcoming)
    const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        // Try to find currently active booking first
        let relevantBooking = await BannerBooking.findOne({
            slotId: slot._id,
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        // If no active booking, find the next upcoming one (active or pending)
        if (!relevantBooking) {
            relevantBooking = await BannerBooking.findOne({
                slotId: slot._id,
                status: { $in: ['active', 'pending'] },
                startDate: { $gt: now }
            }).sort({ startDate: 1 });
        }

        return { ...slot, currentBooking: relevantBooking };
    }));

    // Return with settings structure
    const settings = {
        universalDisplayTime: 3000,
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999,
        pricingStructure: {}
    };

    res.status(200).json({
        success: true,
        data: {
            slots: slotsWithBookings,
            settings
        }
    });
});

export const createBannerBooking = asyncHandler(async (req, res) => {
    const { slotId, startDate, durationDays, bannerType = 'b2b', title, link } = req.body;

    // Log authentication info
    console.log('🔐 [createBannerBooking] User object:', JSON.stringify(req.user, null, 2));
    console.log('🔐 [createBannerBooking] User role:', req.user?.role);

    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    if (!vendorId) {
        console.error('❌ [createBannerBooking] No vendorId found in req.user');
        return res.status(401).json({ success: false, message: 'Vendor authentication failed. Please login again.' });
    }

    console.log('✅ [createBannerBooking] VendorId:', vendorId);

    console.log('📝 [createBannerBooking] Request body:', req.body);
    console.log('📁 [createBannerBooking] File:', req.file ? { fieldname: req.file.fieldname, mimetype: req.file.mimetype, size: req.file.size } : 'No file');

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    if (!slotId || !startDate || !durationDays) {
        return res.status(400).json({ success: false, message: 'Missing required fields: slotId, startDate, durationDays' });
    }

    // Calculate end date from start date + duration days
    // For 1 day: Start Feb 8 00:00 -> End Feb 8 23:59:59 (same day)
    // For 2 days: Start Feb 8 00:00 -> End Feb 9 23:59:59
    const start = new Date(startDate);
    const durationInDays = parseInt(durationDays);
    const end = new Date(start);

    // Add (durationDays - 1) days, then set to end of that day (23:59:59)
    end.setDate(end.getDate() + (durationInDays - 1));
    end.setHours(23, 59, 59, 999);

    // Get slot to calculate amount
    const slot = await BannerSlot.findById(slotId);
    if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    // Check for overlapping bookings
    // A booking overlaps if (newStart <= existingEnd) AND (newEnd >= existingStart)
    const overlappingBooking = await BannerBooking.findOne({
        slotId,
        status: { $in: ['active', 'pending'] },
        $or: [
            {
                startDate: { $lte: end },
                endDate: { $gte: start }
            }
        ]
    });

    if (overlappingBooking) {
        return res.status(400).json({
            success: false,
            message: `This slot is already booked from ${new Date(overlappingBooking.startDate).toLocaleDateString()} to ${new Date(overlappingBooking.endDate).toLocaleDateString()}`
        });
    }

    const amount = slot.price * durationInDays;
    const durationHours = durationInDays * 24;

    // Upload image using buffer
    console.log('☁️ [createBannerBooking] Uploading to Cloudinary...');
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'banners');
    console.log('✅ [createBannerBooking] Upload successful:', uploadResult.secure_url);

    const booking = await BannerBooking.create({
        vendorId,
        slotId,
        bannerType,
        bannerImage: uploadResult.secure_url,
        title: title || '',
        link: link || '/',
        startDate: start,
        endDate: end,
        amount,
        durationHours,
        durationDays: durationInDays,
        referenceId: `B2B-${Date.now().toString(36).toUpperCase()}`,
        status: 'pending',
        paymentStatus: 'unpaid',
        adminApprovalStatus: 'pending'
    });

    console.log('✅ [createBannerBooking] Booking created:', booking._id);

    // Create Razorpay order for payment
    let razorpayOrder = null;
    try {
        const razorpayService = (await import('../services/razorpay.service.js')).default;
        razorpayOrder = await razorpayService.createOrder(
            amount,
            'INR',
            booking.referenceId,
            {
                bookingId: booking._id.toString(),
                vendorId: vendorId.toString(),
                bannerType: 'b2b',
                type: 'banner_booking'
            }
        );

        // Save Razorpay order ID to booking
        booking.razorpayOrderId = razorpayOrder.id;
        await booking.save();

        console.log('✅ [createBannerBooking] Razorpay order created:', razorpayOrder.id);
    } catch (razorpayError) {
        console.error('❌ [createBannerBooking] Razorpay order creation failed:', razorpayError.message);
        // Continue without Razorpay order - booking is still created
    }

    res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
            ...booking.toObject(),
            razorpayOrder: razorpayOrder,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        }
    });
});

export const getMyBookings = asyncHandler(async (req, res) => {
    const { bannerType } = req.query;

    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;
    const query = { vendorId };
    if (bannerType) query.bannerType = bannerType;

    console.log('🔍 [getMyBookings] User:', vendorId, 'Role:', req.user.role);
    console.log('🔍 [getMyBookings] Query:', JSON.stringify(query));

    const bookings = await BannerBooking.find(query)
        .populate('slotId')
        .sort({ createdAt: -1 });

    console.log('🔍 [getMyBookings] Found:', bookings.length);

    res.status(200).json({
        success: true,
        data: bookings
    });
});

export const getBookingDetails = asyncHandler(async (req, res) => {
    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    const booking = await BannerBooking.findOne({
        _id: req.params.id,
        vendorId
    }).populate('slotId');

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
        success: true,
        data: booking
    });
});

export const confirmPayment = asyncHandler(async (req, res) => {
    const { bookingId, razorpayPaymentId, razorpayOrderId, paymentMethod, razorpaySignature } = req.body;

    console.log('💳 [confirmPayment] Request:', { bookingId, razorpayPaymentId, razorpayOrderId, paymentMethod });

    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    if (!vendorId) {
        console.error('❌ [confirmPayment] No vendorId found in req.user');
        return res.status(401).json({ success: false, message: 'Vendor authentication failed' });
    }

    const booking = await BannerBooking.findOne({ _id: bookingId, vendorId });
    if (!booking) {
        console.error('❌ [confirmPayment] Booking not found:', { bookingId, vendorId });
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify Razorpay signature if provided
    if (razorpaySignature && razorpayOrderId && razorpayPaymentId) {
        try {
            const razorpayService = (await import('../services/razorpay.service.js')).default;
            const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

            if (!isValid) {
                console.error('❌ [confirmPayment] Invalid payment signature');
                return res.status(400).json({ success: false, message: 'Invalid payment signature' });
            }
            console.log('✅ [confirmPayment] Payment signature verified');
        } catch (error) {
            console.error('❌ [confirmPayment] Signature verification error:', error);
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    }

    booking.paymentStatus = 'paid';
    booking.status = 'pending'; // Keep as pending until admin approves
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpayOrderId = razorpayOrderId;
    booking.paymentMethod = paymentMethod || 'razorpay';

    await booking.save();

    console.log('✅ [confirmPayment] Payment confirmed for booking:', booking._id);

    res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully. Awaiting admin approval.',
        data: booking
    });
});

export const cancelBooking = asyncHandler(async (req, res) => {
    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    const booking = await BannerBooking.findOne({
        _id: req.params.bookingId,
        vendorId
    });

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
        return res.status(400).json({ success: false, message: 'Cannot cancel paid booking directly' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
        success: true,
        message: 'Booking cancelled'
    });
});



// ==========================================
// PUBLIC CONTROLLERS
// ==========================================

export const getActiveBanners = asyncHandler(async (req, res) => {
    const { bannerType } = req.query;
    const now = new Date();

    const query = {
        status: 'active',
        paymentStatus: 'paid',
        startDate: { $lte: now },
        endDate: { $gte: now }
    };
    if (bannerType) query.bannerType = bannerType;

    const banners = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName businessInfo')
        .sort({ createdAt: -1 });

    const settings = {
        universalDisplayTime: 3
    };

    res.status(200).json({
        success: true,
        data: {
            banners,
            settings
        }
    });
});


// ============================================
// ADMIN BANNER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get all banner slots (Admin)
 */
export const getAdminBannerSlots = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b' } = req.query;

    // Auto-create B2B slots if they don't exist
    if (bannerType === 'b2b') {
        const count = await BannerSlot.countDocuments({ bannerType: 'b2b' });
        if (count === 0) {
            const defaultSlots = Array.from({ length: 5 }, (_, i) => ({
                slotNumber: i + 1,
                bannerType: 'b2b',
                price: 2999 - (i * 200),
                isActive: true
            }));
            await BannerSlot.insertMany(defaultSlots);
        }
    }

    const slots = await BannerSlot.find({ bannerType }).lean().sort({ slotNumber: 1 });
    const now = new Date();

    // Dynamically find most relevant booking for each slot (active or nearest upcoming)
    const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        // Try to find currently active booking first
        let relevantBooking = await BannerBooking.findOne({
            slotId: slot._id,
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).populate('vendorId', 'name storeName email');

        // If no active booking, find the next upcoming one
        if (!relevantBooking) {
            relevantBooking = await BannerBooking.findOne({
                slotId: slot._id,
                status: { $in: ['active', 'pending'] },
                startDate: { $gt: now }
            }).populate('vendorId', 'name storeName email')
                .sort({ startDate: 1 });
        }

        return { ...slot, currentBooking: relevantBooking };
    }));

    const settings = {
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999
    };

    res.status(200).json({
        success: true,
        data: {
            slots: slotsWithBookings,
            settings
        }
    });
});

/**
 * Get all banner bookings (Admin)
 */
export const getAdminBannerBookings = asyncHandler(async (req, res) => {
    const { status, bannerType = 'b2b' } = req.query;

    const query = { bannerType };
    if (status) query.status = status;

    const bookings = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName email phone businessInfo')
        .populate('slotId')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: bookings
    });
});

/**
 * Get banner booking details (Admin)
 */
export const getAdminBannerBookingDetails = asyncHandler(async (req, res) => {
    const booking = await BannerBooking.findById(req.params.id)
        .populate('vendorId', 'name storeName email phone businessInfo')
        .populate('slotId');

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
        success: true,
        data: booking
    });
});

/**
 * Update banner slot (Admin)
 */
export const updateBannerSlot = asyncHandler(async (req, res) => {
    const { price, displayTime } = req.body;

    const slot = await BannerSlot.findById(req.params.id);
    if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    if (price !== undefined) slot.price = price;
    if (displayTime !== undefined) slot.displayTime = displayTime;

    await slot.save();

    res.status(200).json({
        success: true,
        message: 'Slot updated successfully',
        data: slot
    });
});

/**
 * Update banner settings (Admin)
 */
export const updateBannerSettings = asyncHandler(async (req, res) => {
    // This would update global settings in a Settings model
    // For now, just return success
    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: req.body
    });
});

/**
 * Approve banner booking (Admin)
 */
export const approveBannerBooking = asyncHandler(async (req, res) => {
    const booking = await BannerBooking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus !== 'paid') {
        return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    booking.adminApprovalStatus = 'approved';
    booking.status = 'active';
    await booking.save();

    // Update slot's currentBooking reference
    await BannerSlot.findByIdAndUpdate(booking.slotId, {
        currentBooking: booking._id
    });

    res.status(200).json({
        success: true,
        message: 'Booking approved successfully',
        data: booking
    });
});

/**
 * Reject banner booking (Admin)
 */
export const rejectBannerBooking = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const booking = await BannerBooking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.adminApprovalStatus = 'rejected';
    booking.status = 'cancelled';
    booking.rejectionReason = reason || 'No reason provided';
    await booking.save();

    // TODO: Initiate refund if payment was made

    res.status(200).json({
        success: true,
        message: 'Booking rejected successfully',
        data: booking
    });
});

/**
 * Get banner revenue stats (Admin)
 */
export const getBannerRevenueStats = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b' } = req.query;

    const totalBookings = await BannerBooking.countDocuments({ bannerType });
    const activeBookings = await BannerBooking.countDocuments({ bannerType, status: 'active' });
    const pendingBookings = await BannerBooking.countDocuments({ bannerType, status: 'pending', paymentStatus: 'paid' });

    const revenueResult = await BannerBooking.aggregate([
        { $match: { bannerType, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.status(200).json({
        success: true,
        data: {
            totalBookings,
            activeBookings,
            pendingBookings,
            totalRevenue
        }
    });
});

/**
 * Get banner transactions (Admin)
 */
export const getBannerTransactions = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b', limit = 50 } = req.query;

    const transactions = await BannerBooking.find({ bannerType, paymentStatus: 'paid' })
        .populate('vendorId', 'name storeName email')
        .populate('slotId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        data: transactions
    });
});

/**
 * Get banner transaction details (Admin)
 */
export const getBannerTransactionDetails = asyncHandler(async (req, res) => {
    const transaction = await BannerBooking.findById(req.params.id)
        .populate('vendorId', 'name storeName email phone businessInfo')
        .populate('slotId');

    if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
        success: true,
        data: transaction
    });
});

import BannerSlot from '../models/BannerSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Vendor from '../models/Vendor.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import notificationService from '../services/notification.service.js';

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

    // Dynamically find relevant bookings for each slot
    const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        // Add 5.5 hours buffer for IST
        const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

        // Find all bookings that are not cancelled or completed
        const allBookings = await BannerBooking.find({
            slotId: slot._id,
            status: { $in: ['active', 'approved', 'pending'] },
            endDate: { $gte: now }
        }).sort({ startDate: 1 });

        // Identify current booking (if any)
        const currentBooking = allBookings.find(b =>
            b.startDate <= nowWithISTBuffer && b.endDate >= now
        );

        return {
            ...slot,
            currentBooking: currentBooking || null,
            upcomingBookings: allBookings.filter(b => b._id !== currentBooking?._id)
        };
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
    // Normalize start date to 00:00 IST (India Standard Time)
    // MongoDB stores in UTC. 00:00 IST = 18:30 UTC (previous day)
    // If startDate is "2026-02-08", new Date(startDate) is 2026-02-08T00:00:00.000Z
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);


    const durationInDays = parseInt(durationDays);
    const end = new Date(start);
    // Add duration in days (e.g., 1 day = ends 24 hours later)
    end.setUTCHours(end.getUTCHours() + (durationInDays * 24));
    // Set to 23:59:59.999 IST (which is 1ms before next IST day starts)
    end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

    // Get slot to calculate amount
    const slot = await BannerSlot.findById(slotId);
    if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    // Check for overlapping bookings
    // A booking overlaps if (newStart <= existingEnd) AND (newEnd >= existingStart)
    const overlappingBooking = await BannerBooking.findOne({
        slotId,
        status: { $in: ['active', 'approved', 'pending'] },
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

    // Notify admins about banner booking
    try {
        const vendor = await Vendor.findById(vendorId).select('businessName storeName');
        await notificationService.sendBulkNotification({
            type: 'banner_booking',
            title: 'Vendor Banner Booking',
            message: 'Vendor has booked a banner.',
            actionUrl: `/admin/b2b-vendors/banner-bookings`,
            metadata: {
                bookingId: booking._id.toString(),
                vendorId: vendorId.toString(),
                vendorName: vendor?.businessName || vendor?.storeName || 'A vendor',
                bannerType: booking.bannerType,
                amount: booking.amount
            }
        }, 'admins');
    } catch (notifError) {
        console.error('Failed to notify admins about banner booking:', notifError);
    }

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

    // Add 5.5 hours buffer for IST synchronization
    const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    const query = {
        status: { $in: ['active', 'approved'] },
        paymentStatus: 'paid',
        startDate: { $lte: nowWithISTBuffer },
        endDate: { $gte: now }
    };
    if (bannerType) query.bannerType = bannerType;

    const banners = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName businessInfo')
        .sort({ startDate: 1 }); // Sort chronologically by start date

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

    // Dynamically find relevant bookings for each slot
    const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        // Add 5.5 hours buffer for IST
        const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

        // Find all bookings that are not cancelled or completed
        const allBookings = await BannerBooking.find({
            slotId: slot._id,
            status: { $in: ['active', 'approved', 'pending'] },
            endDate: { $gte: now }
        })
            .populate('vendorId', 'name storeName email')
            .sort({ startDate: 1 });

        // Identify current booking (if any)
        const currentBooking = allBookings.find(b =>
            b.startDate <= nowWithISTBuffer && b.endDate >= now
        );

        return {
            ...slot,
            currentBooking: currentBooking || null,
            upcomingBookings: allBookings.filter(b => b._id !== currentBooking?._id)
        };
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

    const now = new Date();
    const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    // Set status based on activation timing
    if (booking.startDate <= nowWithISTBuffer) {
        booking.status = 'active';
    } else {
        booking.status = 'approved';
    }
    await booking.save();

    // Update slot's currentBooking reference IF it's now active
    if (booking.status === 'active') {
        await BannerSlot.findByIdAndUpdate(booking.slotId, {
            currentBooking: booking._id
        });
    }

    // Notify vendor about banner approval
    try {
        await notificationService.createNotification({
            recipientId: booking.vendorId,
            recipientType: 'vendor',
            type: 'banner_booking',
            title: 'Banner Booking Approved!',
            message: 'Your banner booking has been approved and is now active.',
            actionUrl: '/vendor/banners',
            metadata: {
                bookingId: booking._id,
                bannerType: booking.bannerType
            }
        }, req.app.get('io'));
    } catch (notifError) {
        console.error('Failed to notify vendor about banner approval:', notifError);
    }

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

    // Notify vendor about banner rejection
    try {
        await notificationService.createNotification({
            recipientId: booking.vendorId,
            recipientType: 'vendor',
            type: 'banner_booking',
            title: 'Banner Booking Rejected',
            message: `Your banner booking was rejected. ${reason ? `Reason: ${reason}` : ''}`,
            actionUrl: '/vendor/banners',
            metadata: {
                bookingId: booking._id,
                bannerType: booking.bannerType,
                reason: reason
            }
        }, req.app.get('io'));
    } catch (notifError) {
        console.error('Failed to notify vendor about banner rejection:', notifError);
    }

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
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
        totalBookings,
        activeBookingsCount,
        pendingBookings,
        currentMonthRevenue,
        lastMonthRevenue,
        activeBookingsLast30Days,
        uniqueVendors
    ] = await Promise.all([
        BannerBooking.countDocuments({ bannerType }),
        BannerBooking.countDocuments({ bannerType, status: 'active' }),
        BannerBooking.countDocuments({ bannerType, status: 'pending', paymentStatus: 'paid' }),

        // Current month revenue
        BannerBooking.aggregate([
            { $match: { bannerType, paymentStatus: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),

        // Last month revenue (for percentage change)
        BannerBooking.aggregate([
            { $match: { bannerType, paymentStatus: 'paid', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),

        // Active bookings created in last 30 days
        BannerBooking.countDocuments({
            bannerType,
            status: 'active',
            createdAt: { $gte: thirtyDaysAgo }
        }),

        // Unique vendors
        BannerBooking.distinct('vendorId', { bannerType, paymentStatus: 'paid' }),

        // Subscription Revenue (Total from B2B plans)
        VendorSubscription.aggregate([
            { $match: { planId: { $exists: true, $ne: null }, status: { $in: ['active', 'expired'] } } },
            {
                $lookup: {
                    from: 'b2bsubscriptionplans',
                    localField: 'planId',
                    foreignField: '_id',
                    as: 'plan'
                }
            },
            { $unwind: '$plan' },
            { $group: { _id: null, total: { $sum: '$plan.price' } } }
        ])
    ]);

    const bannerRevenueResult = await BannerBooking.aggregate([
        { $match: { bannerType, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const subscriptionRevenue = uniqueVendors[1]?.[0]?.total || 0; // The fifth element in Promise.all is subscription aggregate
    const bannerRevenue = bannerRevenueResult[0]?.total || 0;
    const totalRevenue = bannerRevenue + subscriptionRevenue;
    const currentRev = currentMonthRevenue[0]?.total || 0;
    const lastRev = lastMonthRevenue[0]?.total || 0;

    let percentageChange = 0;
    if (lastRev > 0) {
        percentageChange = ((currentRev - lastRev) / lastRev) * 100;
    } else if (currentRev > 0) {
        percentageChange = 100;
    }

    res.status(200).json({
        success: true,
        data: {
            totalBookings,
            activeBookingsCount,
            pendingBookings,
            totalRevenue,
            bannerRevenue,
            subscriptionRevenue,
            currentMonthRevenue: currentRev,
            percentageChange,
            activeBookingsLast30Days,
            uniqueVendorsCount: uniqueVendors.length,
            totalPaidBookings: await BannerBooking.countDocuments({ bannerType, paymentStatus: 'paid' })
        }
    });
});

/**
 * Get banner transactions (Admin)
 */
export const getBannerTransactions = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b', limit = 50, search = '' } = req.query;

    const query = { bannerType, paymentStatus: 'paid' };

    const transactions = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName email')
        .populate('slotId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    // Map to a more friendly format for the frontend wallet
    const formattedTransactions = transactions.map(txn => {
        const vendorName = txn.vendorId?.storeName || txn.vendorId?.name || 'Unknown B2B Vendor';
        return {
            id: txn.referenceId || txn._id,
            transactionId: txn.razorpayPaymentId || `TXN-${txn._id}`,
            bookingId: txn._id,
            vendor: vendorName,
            amount: txn.amount,
            date: txn.createdAt,
            status: txn.paymentStatus === 'paid' ? 'success' : 'pending',
            method: txn.paymentMethod || 'Razorpay',
            bannerType: txn.bannerType
        };
    });

    res.status(200).json({
        success: true,
        data: formattedTransactions
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

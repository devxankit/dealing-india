import mongoose from 'mongoose';

const bannerBookingSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BannerSlot',
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
    },
    bannerImage: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '/',
    },
    title: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'upi', 'wallet', 'card'],
      default: 'razorpay',
    },
    adminApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    durationHours: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

const BannerBooking = mongoose.model('BannerBooking', bannerBookingSchema);

export default BannerBooking;

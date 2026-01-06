import mongoose from 'mongoose';

const vendorSubscriptionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionTier',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending', 'failed'],
      default: 'pending',
    },
    billingCycle: {
      type: String,
      enum: ['monthly'],
      required: true,
      default: 'monthly',
    },
    usage: {
      reelsUploaded: { type: Number, default: 0 },
      extraReelsCharged: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    lastPaymentDate: {
      type: Date,
    },
    nextBillingDate: {
      type: Date,
    },
    cancellationDate: {
      type: Date,
    },
    auditLogs: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        details: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
vendorSubscriptionSchema.index({ vendorId: 1, status: 1 });
vendorSubscriptionSchema.index({ endDate: 1 });

const VendorSubscription = mongoose.model('VendorSubscription', vendorSubscriptionSchema);

export default VendorSubscription;

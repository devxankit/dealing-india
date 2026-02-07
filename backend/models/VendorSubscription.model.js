import mongoose from 'mongoose';

const vendorSubscriptionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false, // Made optional for pre-payment subscriptions (B2B registration flow)
    },
    // For B2B registration: subscription created before vendor registration
    // Store email/phone to link subscription to vendor later
    pendingVendorEmail: {
      type: String,
      required: false,
      index: true,
    },
    pendingVendorPhone: {
      type: String,
      required: false,
    },
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionTier',
      required: false, // Made optional to support B2B plans
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BSubscriptionPlan',
      required: false, // Optional - for B2B vendor subscriptions
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
vendorSubscriptionSchema.index({ planId: 1 }); // Index for B2B plan queries

// Validation: Either tierId or planId must be provided
// For B2B pre-payment subscriptions: vendorId is optional, but email/phone should be present
vendorSubscriptionSchema.pre('validate', function (next) {
  if (!this.tierId && !this.planId) {
    const error = new Error('Either tierId or planId must be provided');
    error.name = 'ValidationError';
    return next(error);
  }

  // For B2B pre-payment subscriptions: vendorId can be null if pendingVendorEmail is present
  if (!this.vendorId && !this.pendingVendorEmail) {
    const error = new Error('Either vendorId or pendingVendorEmail must be provided');
    error.name = 'ValidationError';
    return next(error);
  }

  next();
});

const VendorSubscription = mongoose.model('VendorSubscription', vendorSubscriptionSchema);

export default VendorSubscription;

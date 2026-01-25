import mongoose from 'mongoose';

const SubscriptionTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['Free', 'Starter', 'Professional', 'Premium'],
    },
    description: {
      type: String,
      required: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
      min: 0,
    },
    reelLimit: {
      type: Number,
      default: 0, // 0 for Free, 30 for Starter, 100 for Professional, -1 for Premium
    },
    extraReelPrice: {
      type: Number,
      default: 10, // ₹10 per extra reel
    },
    features: [
      {
        name: { type: String, required: true },
        included: { type: Boolean, default: true },
        limit: { type: Number, default: -1 }, // -1 means unlimited
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly'],
      default: 'monthly',
    },
    razorpayPlanId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SubscriptionTier =
  mongoose.models.SubscriptionTier ||
  mongoose.model("SubscriptionTier", SubscriptionTierSchema);

export default SubscriptionTier;


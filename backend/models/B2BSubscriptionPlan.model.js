import mongoose from 'mongoose';

const b2bSubscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [100, 'Plan name cannot exceed 100 characters'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      enum: [3, 6, 12],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    features: [
      {
        type: String,
        trim: true,
        maxlength: [200, 'Feature description cannot exceed 200 characters'],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    razorpayPlanId: {
      type: String,
      default: null,
    },
    allowedBusinessTypes: [
      {
        type: String, // Storing Slugs for ease of use across environments
        default: []
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Index for active plans query
b2bSubscriptionPlanSchema.index({ isActive: 1, duration: 1 });

// Prevent duplicate durations
// b2bSubscriptionPlanSchema.index({ duration: 1 }, { unique: true });

const B2BSubscriptionPlan =
  mongoose.models.B2BSubscriptionPlan ||
  mongoose.model('B2BSubscriptionPlan', b2bSubscriptionPlanSchema);

export default B2BSubscriptionPlan;


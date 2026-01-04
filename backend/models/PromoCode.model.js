import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Promo code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    type: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: ['percentage', 'fixed'],
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be positive'],
      validate: {
        validator: function (v) {
          if (this.type === 'percentage') {
            return v >= 0 && v <= 100;
          }
          return v >= 0;
        },
        message: 'Percentage must be 0-100, fixed amount must be positive',
      },
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: [0, 'Minimum purchase must be positive'],
    },
    maxDiscount: {
      type: Number,
      min: [0, 'Maximum discount must be positive'],
    },
    usageLimit: {
      type: Number,
      default: -1, // -1 means unlimited
      min: [-1, 'Usage limit must be -1 (unlimited) or positive'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (v) {
          return v > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (code already has unique: true in field definition)
promoCodeSchema.index({ status: 1 });
promoCodeSchema.index({ startDate: 1, endDate: 1 });

// Virtual to check if promo code is expired
promoCodeSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

// Virtual to check if promo code is active and valid
promoCodeSchema.virtual('isValid').get(function () {
  const now = new Date();
  return (
    this.status === 'active' &&
    now >= this.startDate &&
    now <= this.endDate &&
    (this.usageLimit === -1 || this.usedCount < this.usageLimit)
  );
});

// Method to update status based on dates
promoCodeSchema.methods.updateStatus = function () {
  const now = new Date();
  if (now > this.endDate) {
    this.status = 'expired';
  } else if (now < this.startDate) {
    this.status = 'inactive';
  } else if (this.status === 'expired') {
    // Don't auto-activate expired codes
    return;
  } else if (this.status === 'inactive' && now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
  }
};

// Pre-save hook to update status
promoCodeSchema.pre('save', function (next) {
  this.updateStatus();
  next();
});

// Include virtuals in JSON output
promoCodeSchema.set('toJSON', { virtuals: true });
promoCodeSchema.set('toObject', { virtuals: true });

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode;


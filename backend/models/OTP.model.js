import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      length: 4,
      validate: {
        validator: function (v) {
          return /^\d{4}$/.test(v);
        },
        message: 'OTP code must be exactly 4 digits',
      },
    },
    type: {
      type: String,
      required: true,
      enum: ['email_verification', 'password_reset'],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
otpSchema.index({ identifier: 1, type: 1, isUsed: 1 });
otpSchema.index({ identifier: 1, type: 1, expiresAt: 1 });

// Prevent duplicate active OTPs (same identifier, type, not used, not expired)
otpSchema.index(
  { identifier: 1, type: 1, isUsed: 1, expiresAt: 1 },
  {
    unique: true,
    partialFilterExpression: { isUsed: false },
  }
);

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;


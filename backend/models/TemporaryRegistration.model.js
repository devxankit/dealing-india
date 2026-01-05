import mongoose from 'mongoose';

const temporaryRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    registrationType: {
      type: String,
      required: true,
      enum: ['user', 'vendor'],
    },
    registrationData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion after expiration
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
temporaryRegistrationSchema.index({ email: 1, registrationType: 1, isVerified: 1 });
temporaryRegistrationSchema.index({ expiresAt: 1 });

const TemporaryRegistration = mongoose.model('TemporaryRegistration', temporaryRegistrationSchema);

export default TemporaryRegistration;


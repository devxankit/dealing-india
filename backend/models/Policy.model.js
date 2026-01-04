import mongoose from 'mongoose';

const policySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Policy key is required'],
      unique: true,
      enum: ['privacy', 'refund', 'terms'],
    },
    content: {
      type: String,
      required: [true, 'Policy content is required'],
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index (key already has unique: true in field definition)

const Policy = mongoose.model('Policy', policySchema);

export default Policy;


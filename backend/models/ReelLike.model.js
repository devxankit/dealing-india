import mongoose from 'mongoose';

const reelLikeSchema = new mongoose.Schema(
  {
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reelModel',
      required: true,
    },
    reelModel: {
      type: String,
      required: true,
      enum: ['Reel', 'PromotionalReel'],
      default: 'Reel',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only like a specific reel (of a specific type) once
reelLikeSchema.index({ reelId: 1, userId: 1, reelModel: 1 }, { unique: true });

// Indexes
reelLikeSchema.index({ reelId: 1, reelModel: 1 });
reelLikeSchema.index({ userId: 1 });

const ReelLike = mongoose.model('ReelLike', reelLikeSchema);

export default ReelLike;


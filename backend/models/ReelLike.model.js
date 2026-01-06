import mongoose from 'mongoose';

const reelLikeSchema = new mongoose.Schema(
  {
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
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

// Ensure a user can only like a reel once
reelLikeSchema.index({ reelId: 1, userId: 1 }, { unique: true });

// Indexes
reelLikeSchema.index({ reelId: 1 });
reelLikeSchema.index({ userId: 1 });

const ReelLike = mongoose.model('ReelLike', reelLikeSchema);

export default ReelLike;


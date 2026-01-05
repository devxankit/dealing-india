import mongoose from 'mongoose';

const reelCommentSchema = new mongoose.Schema(
  {
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: [true, 'Reel ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
reelCommentSchema.index({ reelId: 1, createdAt: -1 });
reelCommentSchema.index({ userId: 1 });
reelCommentSchema.index({ isActive: 1 });

const ReelComment = mongoose.model('ReelComment', reelCommentSchema);

export default ReelComment;


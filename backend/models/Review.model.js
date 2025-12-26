import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
      index: true,
    },
    review: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected', 'hidden'],
      default: 'pending',
      index: true,
    },
    vendorResponse: {
      type: String,
      trim: true,
      default: null,
    },
    responseDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for product ratings
reviewSchema.index({ productId: 1, rating: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;


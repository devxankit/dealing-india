import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
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
    },
    review: {
      type: String,
      trim: true,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected', 'hidden'],
      default: 'pending',
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


// Ensure a user can only review a product once per order
reviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

// Indexes
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for product ratings
reviewSchema.index({ productId: 1, rating: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;


import mongoose from 'mongoose';

const productFAQSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productFAQSchema.index({ productId: 1, status: 1 });
productFAQSchema.index({ productId: 1, order: 1 });
productFAQSchema.index({ vendorId: 1, status: 1 });
productFAQSchema.index({ vendorId: 1, productId: 1 });

const ProductFAQ = mongoose.model('ProductFAQ', productFAQSchema);

export default ProductFAQ;


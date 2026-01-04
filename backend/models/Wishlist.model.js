import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes (userId already has unique: true in field definition)
wishlistSchema.index({ 'products.productId': 1 });

// Prevent duplicate products in wishlist
wishlistSchema.pre('save', function (next) {
  if (this.isModified('products')) {
    const seen = new Set();
    this.products = this.products.filter((product) => {
      const productId = product.productId.toString();
      if (seen.has(productId)) {
        return false;
      }
      seen.add(productId);
      return true;
    });
  }
  next();
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;


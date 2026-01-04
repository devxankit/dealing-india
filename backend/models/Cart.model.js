import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
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
cartSchema.index({ 'items.productId': 1 });

// Prevent duplicate products in cart
cartSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    const seen = new Set();
    this.items = this.items.filter((item) => {
      const productId = item.productId.toString();
      if (seen.has(productId)) {
        // If duplicate, merge quantities
        const existingIndex = this.items.findIndex(
          (i) => i.productId.toString() === productId && !seen.has(productId)
        );
        if (existingIndex !== -1) {
          this.items[existingIndex].quantity += item.quantity;
        }
        return false;
      }
      seen.add(productId);
      return true;
    });
  }
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;


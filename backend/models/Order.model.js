import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        image: String,
        variant: {
          type: Object,
          default: null
        },
      },
    ],
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready_to_ship', 'dispatched', 'shipped_seller', 'shipped', 'delivered', 'cancelled', 'refunded', 'on_hold'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['creditCard', 'debitCard', 'upi', 'wallet', 'cash', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
      sparse: true,
    },
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    // Pricing breakdown (denormalized for performance)
    pricing: {
      subtotal: {
        type: Number,
        min: 0,
        default: 0,
      },
      tax: {
        type: Number,
        min: 0,
        default: 0,
      },
      discount: {
        type: Number,
        min: 0,
        default: 0,
      },
      shipping: {
        type: Number,
        min: 0,
        default: 0,
      },
      platformFee: {
        type: Number,
        min: 0,
        default: 0,
      },
      total: {
        type: Number,
        min: 0,
        default: 0,
      },
      couponCode: {
        type: String,
        default: null,
      },
    },
    // Customer snapshot (denormalized)
    customerSnapshot: {
      name: String,
      email: String,
      phone: String,
    },
    // Status history with timestamps
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'statusHistory.changedByModel',
        },
        changedByModel: {
          type: String,
          enum: ['User', 'Vendor', 'Admin'],
        },
        changedByRole: {
          type: String,
          enum: ['user', 'vendor', 'admin'],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
    // Cancellation info
    cancellation: {
      cancelledAt: Date,
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
      },
      cancelledByRole: {
        type: String,
        enum: ['user', 'vendor', 'admin'],
      },
      reason: String,
      refundStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
      },
      refundAmount: {
        type: Number,
        min: 0,
      },
      refundTransactionId: String,
    },
    // Tracking info
    tracking: {
      trackingNumber: String,
      carrier: String,
      estimatedDelivery: Date,
      deliveredAt: Date,
    },
    // Return window and settlement tracking
    returnWindowExpiresAt: {
      type: Date,
    },
    fundsReleased: {
      type: Boolean,
      default: false,
    },
    // Vendor breakdown (for multi-vendor orders)
    vendorBreakdown: [
      {
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
        },
        vendorName: String,
        subtotal: {
          type: Number,
          min: 0,
        },
        shipping: {
          type: Number,
          min: 0,
        },
        tax: {
          type: Number,
          min: 0,
        },
        discount: {
          type: Number,
          min: 0,
        },
        commission: {
          type: Number,
          min: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes (orderCode already has unique: true in field definition)
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'vendorBreakdown.vendorId': 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;


import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientTypeModel',
    },
    recipientType: {
      type: String,
      required: true,
      enum: ['user', 'vendor', 'admin'],
    },
    recipientTypeModel: {
      type: String,
      required: true,
      enum: ['User', 'Vendor', 'Admin'],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'order_placed',
        'order_confirmed',
        'order_shipped',
        'order_delivered',
        'order_cancelled',
        'payment_success',
        'payment_failed',
        'new_order',
        'order_status_change',
        'return_request',
        'review',
        'system',
        'offer',
        'promotion',
        'custom',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
notificationSchema.index({ recipientId: 1, recipientType: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });
notificationSchema.index({ orderId: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;


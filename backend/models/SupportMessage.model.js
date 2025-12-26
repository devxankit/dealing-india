import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: [true, 'Ticket reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Sender is required'],
      refPath: 'senderType',
    },
    senderType: {
      type: String,
      required: [true, 'Sender type is required'],
      enum: ['user', 'vendor', 'admin'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
supportMessageSchema.index({ ticket: 1, createdAt: -1 });
supportMessageSchema.index({ sender: 1, senderType: 1 });
supportMessageSchema.index({ isRead: 1 });

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);

export default SupportMessage;


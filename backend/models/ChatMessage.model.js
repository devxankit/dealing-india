import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: [true, 'Chat session reference is required'],
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
  },
  {
    timestamps: true,
  }
);

// Indexes
chatMessageSchema.index({ session: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, senderType: 1 });
chatMessageSchema.index({ isRead: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;


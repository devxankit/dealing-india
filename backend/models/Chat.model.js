import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'participants.roleModel',
        },
        role: {
          type: String,
          enum: ['user', 'vendor'],
          required: true,
        },
        roleModel: {
          type: String,
          enum: ['User', 'Vendor'],
          required: true,
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient conversation lookup
chatSchema.index({ 'participants.userId': 1, 'participants.role': 1 });
chatSchema.index({ lastMessageAt: -1 });

// Note: Unique constraint removed to allow multiple conversations
// The service layer ensures one conversation per user-vendor pair

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;


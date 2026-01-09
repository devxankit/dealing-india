import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
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

// Compound index for efficient conversation lookup between two vendors
chatSchema.index({ 'participants.vendorId': 1 });
chatSchema.index({ lastMessageAt: -1 });

// Ensure exactly 2 participants (vendor-to-vendor)
chatSchema.pre('save', function (next) {
  if (this.participants.length !== 2) {
    next(new Error('Chat must have exactly 2 vendor participants'));
  }
  next();
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;


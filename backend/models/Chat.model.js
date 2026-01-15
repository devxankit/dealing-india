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
          required: true,
          enum: ['user', 'vendor'],
        },
        roleModel: {
          type: String,
          required: true,
          enum: ['User', 'Vendor'],
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
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ lastMessageAt: -1 });

// Ensure exactly 2 participants
chatSchema.pre('save', function (next) {
  if (this.participants.length !== 2) {
    next(new Error('Chat must have exactly 2 participants'));
  }
  next();
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

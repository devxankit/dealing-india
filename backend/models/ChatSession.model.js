import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Participant is required'],
      refPath: 'participantType',
      index: true,
    },
    participantType: {
      type: String,
      required: [true, 'Participant type is required'],
      enum: ['user', 'vendor'],
    },
    lastMessage: {
      type: String,
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
      index: true,
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes - Ensure one session per participant
chatSessionSchema.index({ participant: 1, participantType: 1 }, { unique: true });
chatSessionSchema.index({ status: 1 });
chatSessionSchema.index({ lastMessageAt: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;


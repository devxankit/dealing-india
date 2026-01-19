import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'senderRoleModel',
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['user', 'vendor'],
    },
    senderRoleModel: {
      type: String,
      required: true,
      enum: ['User', 'Vendor'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'receiverRoleModel',
    },
    receiverRole: {
      type: String,
      required: true,
      enum: ['user', 'vendor'],
    },
    receiverRoleModel: {
      type: String,
      required: true,
      enum: ['User', 'Vendor'],
    },
    message: {
      type: String,
      required: function() {
        // Allow empty message if:
        // 1. metadata exists (for images, files, products)
        // 2. messageType is image, file, or product
        const hasMetadata = this.metadata && Object.keys(this.metadata).length > 0;
        const isMediaType = ['image', 'file', 'product', 'inquiry'].includes(this.messageType);
        
        // If it's a media type or has metadata, message is optional (not required)
        if (hasMetadata || isMediaType) {
          return false;
        }
        
        // Otherwise, message is required
        return true;
      },
      trim: true,
      default: '',
    },
    messageType: {
      type: String,
      enum: ['text', 'inquiry', 'image', 'file', 'product'],
      default: 'text',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    readStatus: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, readStatus: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;

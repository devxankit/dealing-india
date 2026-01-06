import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
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
      enum: ['user', 'vendor', 'admin'],
      required: true,
    },
    senderRoleModel: {
      type: String,
      enum: ['User', 'Vendor', 'Admin'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        url: String,
        filename: String,
        mimetype: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ticketMessageSchema.index({ ticketId: 1, createdAt: -1 });
ticketMessageSchema.index({ senderId: 1, senderRole: 1 });

const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);

export default TicketMessage;


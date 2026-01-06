import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    createdByRole: {
      type: String,
      enum: ['user', 'vendor'],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.createdByRole === 'user';
      },
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: function() {
        return this.createdByRole === 'vendor';
      },
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['subscription', 'payment', 'billing', 'technical', 'other'],
      default: 'subscription',
      required: true,
    },
    issueType: {
      type: String,
      enum: [
        'payment_failed',
        'refund_request',
        'activation_issue',
        'upgrade_downgrade',
        'billing_issue',
        'other'
      ],
      default: 'other',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    // Subscription-related fields
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorSubscription',
    },
    transactionId: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    // Admin response
    adminResponse: {
      type: String,
      trim: true,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    respondedAt: {
      type: Date,
    },
    // Status history
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
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
supportTicketSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ userId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ createdByRole: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ category: 1, status: 1 });
supportTicketSchema.index({ priority: 1, status: 1 });

// Generate ticket number before saving
supportTicketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const year = new Date().getFullYear();
    const SupportTicketModel = mongoose.model('SupportTicket');
    const count = await SupportTicketModel.countDocuments({
      ticketNumber: new RegExp(`^TKT-${year}-`)
    });
    this.ticketNumber = `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;


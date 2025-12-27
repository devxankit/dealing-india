import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Ticket creator is required'],
      refPath: 'createdByType',
    },
    createdByType: {
      type: String,
      required: [true, 'Creator type is required'],
      enum: ['user', 'vendor'],
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketType',
      required: [true, 'Ticket type is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportMessage',
      },
    ],
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
supportTicketSchema.index({ ticketNumber: 1 }, { unique: true });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ createdBy: 1, createdByType: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ createdAt: -1 });

// Generate ticket number before creating (only on new documents)
supportTicketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    try {
      // Generate ticket number: TKT-XXXXXX (6 digits)
      // Use this.constructor to reference the model directly
      const count = await this.constructor.countDocuments();
      const ticketNum = String(count + 1).padStart(6, '0');
      this.ticketNumber = `TKT-${ticketNum}`;
      
      // Retry logic in case of duplicate ticket number (race condition)
      let attempts = 0;
      while (attempts < 5) {
        try {
          // Check if ticket number already exists
          const existing = await this.constructor.findOne({ ticketNumber: this.ticketNumber });
          if (!existing) {
            break; // Ticket number is unique, proceed
          }
          // If duplicate, generate new number
          const newCount = await this.constructor.countDocuments();
          const newTicketNum = String(newCount + 1 + attempts).padStart(6, '0');
          this.ticketNumber = `TKT-${newTicketNum}`;
          attempts++;
        } catch (err) {
          attempts++;
          if (attempts >= 5) {
            throw new Error('Failed to generate unique ticket number');
          }
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;


import mongoose from 'mongoose';

const ticketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ticket type name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Ticket type name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ticketTypeSchema.index({ status: 1 });
ticketTypeSchema.index({ name: 1 }, { unique: true });

const TicketType = mongoose.model('TicketType', ticketTypeSchema);

export default TicketType;


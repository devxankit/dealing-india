import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Attribute name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      required: [true, 'Attribute type is required'],
      enum: ['select', 'text', 'number', 'boolean'],
      default: 'select',
    },
    required: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (define once, not in schema fields)
attributeSchema.index({ name: 1 });
attributeSchema.index({ status: 1 });

const Attribute = mongoose.model('Attribute', attributeSchema);

export default Attribute;


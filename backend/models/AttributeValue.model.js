import mongoose from 'mongoose';

const attributeValueSchema = new mongoose.Schema(
  {
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attribute',
      required: [true, 'Attribute ID is required'],
    },
    value: {
      type: String,
      required: [true, 'Attribute value is required'],
      trim: true,
      maxlength: [200, 'Value cannot exceed 200 characters'],
    },
    displayOrder: {
      type: Number,
      default: 1,
      min: [1, 'Display order must be at least 1'],
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

// Indexes for faster queries (define once, not in schema fields)
attributeValueSchema.index({ attributeId: 1, status: 1 });
attributeValueSchema.index({ displayOrder: 1 });

// Compound index to prevent duplicate values for same attribute
attributeValueSchema.index({ attributeId: 1, value: 1 }, { unique: true });

const AttributeValue = mongoose.model('AttributeValue', attributeValueSchema);

export default AttributeValue;


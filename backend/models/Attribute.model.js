import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      trim: true,
      maxlength: [100, 'Attribute name cannot exceed 100 characters'],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
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
    categoryIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: [],
    }],
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
attributeSchema.index({ name: 1, vendorId: 1 }, { unique: true });
attributeSchema.index({ vendorId: 1 });
attributeSchema.index({ status: 1 });

const Attribute = mongoose.model('Attribute', attributeSchema);

export default Attribute;


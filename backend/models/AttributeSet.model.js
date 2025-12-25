import mongoose from 'mongoose';

const attributeSetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Attribute set name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Attribute set name cannot exceed 100 characters'],
    },
    attributes: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Attribute set must have at least one attribute',
      },
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
attributeSetSchema.index({ name: 1 });
attributeSetSchema.index({ status: 1 });

const AttributeSet = mongoose.model('AttributeSet', attributeSetSchema);

export default AttributeSet;


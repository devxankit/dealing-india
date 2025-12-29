import mongoose from 'mongoose';

const taxRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tax rule name is required'],
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, 'Tax rate is required'],
      min: 0,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Tax type is required'],
      default: 'percentage',
    },
    applicableTo: {
      type: String,
      trim: true,
      default: 'all',
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

// Indexes
taxRuleSchema.index({ status: 1 });
taxRuleSchema.index({ applicableTo: 1 });

const TaxRule = mongoose.model('TaxRule', taxRuleSchema);

export default TaxRule;


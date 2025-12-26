import mongoose from 'mongoose';

const pricingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pricing rule name is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['discount', 'markup'],
      required: [true, 'Pricing rule type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Pricing rule value is required'],
      min: 0,
    },
    minQuantity: {
      type: Number,
      min: 1,
      default: null,
    },
    applicableTo: {
      type: String,
      trim: true,
      default: null,
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
pricingRuleSchema.index({ status: 1 });
pricingRuleSchema.index({ type: 1 });

const PricingRule = mongoose.model('PricingRule', pricingRuleSchema);

export default PricingRule;


import mongoose from 'mongoose';

const returnPolicyConfigSchema = new mongoose.Schema(
    {
        returnWindowDays: {
            type: Number,
            default: 7,
            min: 0,
        },
        autoApproveEnabled: {
            type: Boolean,
            default: false,
        },
        autoApproveMaxAmount: {
            type: Number,
            default: 500, // Auto-approve if refund amount is less than this
        },
        eligibleReasons: [{
            type: String,
            trim: true
        }],
        nonReturnableCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        }],
        refundMethod: {
            type: String,
            enum: ['wallet', 'original_payment', 'customer_choice'],
            default: 'wallet',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        }
    },
    {
        timestamps: true,
    }
);

// We usually only need one active config document
const ReturnPolicyConfig = mongoose.model('ReturnPolicyConfig', returnPolicyConfigSchema);

export default ReturnPolicyConfig;

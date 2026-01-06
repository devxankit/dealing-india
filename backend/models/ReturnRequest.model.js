import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema(
    {
        returnCode: {
            type: String,
            required: true,
            unique: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        vendorId: { // Primary vendor if single vendor, or main vendor for mixed orders (can be enhanced for multi-vendor split returns)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                variantId: {
                    type: String, // For specific variant identification
                },
                name: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                reason: {
                    type: String,
                    required: true,
                    enum: [
                        'defective',
                        'wrong_item',
                        'wrong_size',
                        'not_as_described',
                        'quality_issue',
                        'change_of_mind', // Depending on policy
                        'other'
                    ],
                },
                image: String, // Product image
            },
        ],
        reason: { // Main reason summary
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
            trim: true,
        },
        images: [{ // Proof images uploaded by customer
            type: String,
        }],
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'],
            default: 'pending',
        },
        refundAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        refundMethod: {
            type: String,
            enum: ['wallet', 'original_payment'],
            default: 'wallet',
        },
        refundStatus: {
            type: String,
            enum: ['pending', 'processing', 'processed', 'failed'],
            default: 'pending',
        },
        refundTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RefundTransaction',
        },
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
                    enum: ['User', 'Vendor', 'Admin', 'System'],
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                note: String,
            },
        ],
        adminNotes: String,
        vendorNotes: String,
        rejectionReason: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
returnRequestSchema.index({ customerId: 1, createdAt: -1 });
returnRequestSchema.index({ vendorId: 1, status: 1 });
returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ status: 1 });

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

export default ReturnRequest;

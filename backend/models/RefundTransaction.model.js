import mongoose from 'mongoose';

const refundTransactionSchema = new mongoose.Schema(
    {
        refundCode: {
            type: String,
            required: true,
            unique: true
        },
        returnRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ReturnRequest',
            required: true,
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
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        method: {
            type: String,
            enum: ['wallet', 'original_payment'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        walletTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WalletTransaction', // Reference if refund was to wallet
        },
        vendorWalletTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VendorWalletTransaction', // Reference to the debit transaction for the vendor
        },
        externalTransactionId: {
            type: String, // e.g. Razorpay refund ID
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'processedByModel',
        },
        processedByModel: {
            type: String,
            enum: ['Admin', 'System'],
            default: 'System'
        },
        processedAt: Date,
        failureReason: String,
    },
    {
        timestamps: true,
    }
);

refundTransactionSchema.index({ returnRequestId: 1 });
refundTransactionSchema.index({ orderId: 1 });
refundTransactionSchema.index({ customerId: 1 });

const RefundTransaction = mongoose.model('RefundTransaction', refundTransactionSchema);

export default RefundTransaction;

import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
    {
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
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            default: null,
        },
        adminNotes: {
            type: String,
            trim: true,
            default: '',
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: '',
        },
        transactionId: {
            type: String,
            trim: true,
            default: '',
        },
        paymentMethod: {
            type: String,
            default: 'bank_transfer',
        },
    },
    {
        timestamps: true,
    }
);

withdrawalRequestSchema.index({ vendorId: 1, status: 1 });
withdrawalRequestSchema.index({ requestedAt: -1 });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;

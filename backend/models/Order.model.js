import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
    {
        orderCode: {
            type: String,
            required: true,
            unique: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                name: String,
                quantity: Number,
                price: Number,
                image: String,
            },
        ],
        total: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: [
                'pending',
                'processing',
                'ready_to_ship',
                'dispatched',
                'shipped_seller',
                'shipped',
                'delivered',
                'cancelled',
                'returned',
                'refunded',
            ],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        shippingAddress: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Address',
        },
        pricing: {
            subtotal: Number,
            tax: Number,
            discount: { type: Number, default: 0 },
            shipping: { type: Number, default: 0 },
            platformFee: { type: Number, default: 0 },
            total: Number,
            couponCode: String,
        },
        customerSnapshot: {
            name: String,
            email: String,
            phone: String,
        },
        statusHistory: [
            {
                status: String,
                changedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'statusHistory.changedByRole' },
                changedByRole: { type: String, enum: ['user', 'vendor', 'admin', 'system'] },
                timestamp: { type: Date, default: Date.now },
                note: String,
            },
        ],
        fundsReleased: {
            type: Boolean,
            default: false,
        },
        vendorBreakdown: [
            {
                vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
                vendorName: String,
                subtotal: Number,
                shipping: Number,
                tax: Number,
                discount: Number,
                commission: Number,
            },
        ],
        orderDate: {
            type: Date,
            default: Date.now,
        },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        cancellation: {
            cancelledAt: Date,
            cancelledBy: { type: mongoose.Schema.Types.ObjectId },
            cancelledByRole: String,
            reason: String,
            refundStatus: String,
            refundAmount: Number,
        },
        tracking: {
            deliveredAt: Date,
        },
        returnWindowExpiresAt: Date,
    },
    {
        timestamps: true,
    }
);

// Fix for virtuals
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;

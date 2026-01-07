import ReturnRequest from '../models/ReturnRequest.model.js';
import ReturnPolicyConfig from '../models/ReturnPolicyConfig.model.js';
import RefundTransaction from '../models/RefundTransaction.model.js';
import Order from '../models/Order.model.js';
import { createWalletTransaction } from './wallet.service.js';
import VendorWalletService from './vendorWallet.service.js';
import notificationService from './notification.service.js';
import mongoose from 'mongoose';

import Product from '../models/Product.model.js';

class ReturnService {
    /**
     * Generate unique return code
     */
    async generateReturnCode() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `RET-${timestamp}${random}`;
    }

    /**
     * Generate unique refund code
     */
    async generateRefundCode() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `RFD-${timestamp}${random}`;
    }

    /**
     * Get active return policy configuration
     */
    async getPolicyConfig() {
        let config = await ReturnPolicyConfig.findOne();
        if (!config) {
            config = await ReturnPolicyConfig.create({
                returnWindowDays: 7,
                autoApproveEnabled: false,
                refundMethod: 'wallet'
            });
        }
        return config;
    }

    async createReturnRequest(userId, returnData) {
        const { orderId, items } = returnData;

        // Check eligibility again
        const eligibility = await this.checkEligibility(orderId, userId);
        if (!eligibility.eligible) {
            throw new Error(eligibility.reason);
        }

        // Validate order actually belongs to customer
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');

        // Use loose equality for ObjectId vs String comparison
        if (order.customer.toString() !== userId.toString()) {
            throw new Error('Unauthorized return request');
        }

        // Get vendorId from the first product
        // We assume return items belong to the same vendor for now
        // or we default to the vendor of the first item
        const firstItem = items[0];
        const product = await Product.findById(firstItem.productId || firstItem.id);

        if (!product) throw new Error('Product info not found for return item');
        const vendorId = product.vendorId;

        // Generate return code
        const returnCode = await this.generateReturnCode();

        // Create request
        const returnRequest = await ReturnRequest.create({
            ...returnData,
            customerId: userId,
            vendorId,
            returnCode,
            status: 'pending',
            refundAmount: 0 // Will be calculated below
        });

        // Calculate refund amount from items in order
        let calculatedRefund = 0;
        for (const retItem of items) {
            const orderItem = order.items.find(i => (i._id && i._id.toString() === retItem.itemId) || (i.id === retItem.itemId));
            if (orderItem) {
                calculatedRefund += (orderItem.price * retItem.quantity);
            }
        }
        returnRequest.refundAmount = calculatedRefund;
        await returnRequest.save();

        return returnRequest;
    }

    async checkEligibility(orderId, userId) {
        const order = await Order.findById(orderId);
        if (!order) return { eligible: false, reason: 'Order not found' };

        // Check if delivered
        if (order.status !== 'delivered') {
            return { eligible: false, reason: 'Order is not delivered yet' };
        }

        // Check return window (e.g., 7 days)
        const deliveryDate = new Date(order.statusHistory.find(h => h.status === 'delivered')?.date || order.updatedAt);
        const now = new Date();
        const diffDays = Math.ceil((now - deliveryDate) / (1000 * 60 * 60 * 24));

        if (diffDays > 7) {
            return { eligible: false, reason: 'Return period expired' };
        }

        // Check if already returned BY THIS USER
        // If userId is provided, ensure we only block if the return belongs to SAME user.
        // If no userId provided (rare), fallback to partial check? No, always require userId now.
        const query = { orderId, status: { $nin: ['cancelled', 'rejected'] } };
        if (userId) {
            query.customerId = userId;
        }

        const existingReturn = await ReturnRequest.findOne(query);
        if (existingReturn) {
            console.log('Service: checkEligibility - Existing return found:', existingReturn._id, 'Customer:', existingReturn.customerId);
            return { eligible: false, reason: 'Return request already exists for this order' };
        }

        return { eligible: true };
    }

    /**
     * Create a return request
     */
    async createReturnRequest(userId, returnData) {
        const { orderId, items, reason, description, images } = returnData;

        // 1. Validate Eligibility
        const eligibility = await this.checkEligibility(orderId);
        if (!eligibility.eligible) {
            throw new Error(eligibility.reason);
        }

        const order = await Order.findById(orderId);
        if (order.customerId.toString() !== userId) {
            throw new Error('Unauthorized');
        }

        // 2. Validate Items & Calculate Refund Amount
        let totalRefundAmount = 0;
        const returnItems = [];

        for (const item of items) {
            const orderItem = order.items.find(oi =>
                (oi.productId.toString() === item.productId || oi._id.toString() === item.itemId)
            );

            if (!orderItem) continue;

            const refundItemAmount = orderItem.price * item.quantity;
            totalRefundAmount += refundItemAmount;

            returnItems.push({
                productId: orderItem.productId,
                name: orderItem.name,
                quantity: item.quantity,
                price: orderItem.price,
                reason: item.reason || reason,
                image: orderItem.image
            });
        }

        if (returnItems.length === 0) {
            throw new Error('No valid items to return');
        }

        // 3. Auto-Approval (Always True)
        const config = await this.getPolicyConfig();
        // Force auto-approve regardless of config/amount
        let initialStatus = 'approved';
        let refundStatus = 'processing';

        // Determine Vendor
        let vendorId = null;
        if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
            vendorId = order.vendorBreakdown[0].vendorId;
        } else {
            // Fallback logic
            vendorId = process.env.ADMIN_VENDOR_ID || order.vendorBreakdown?.[0]?.vendorId;
        }

        // 4. Create Request
        const returnCode = await this.generateReturnCode();

        const returnRequest = await ReturnRequest.create({
            returnCode,
            orderId,
            customerId: userId,
            vendorId,
            items: returnItems,
            reason,
            description,
            images,
            refundAmount: totalRefundAmount,
            status: initialStatus,
            refundStatus,
            refundMethod: config.refundMethod === 'customer_choice' ? (returnData.refundMethod || 'wallet') : config.refundMethod,
            statusHistory: [{
                status: initialStatus,
                changedBy: userId,
                changedByModel: 'User',
                note: 'Return request created'
            }]
        });

        // 5. Notifications
        await notificationService.createNotification({
            recipientId: userId,
            recipientType: 'user', // Corrected from recipientModel
            title: 'Return Request Submitted',
            message: `Your return request ${returnCode} has been submitted.`,
            type: 'return_request',
            relatedId: returnRequest._id,
            onModel: 'ReturnRequest'
        });

        if (vendorId) {
            await notificationService.createNotification({
                recipientId: vendorId,
                recipientType: 'vendor',
                title: 'New Return (Auto-Approved)',
                message: `Return ${returnCode} for Order ${order.orderCode} has been auto-approved.`,
                type: 'return_request', // Enum valid
                relatedId: returnRequest._id,
                onModel: 'ReturnRequest'
            });
        }

        // 6. Trigger Immediate Refund
        try {
            // Use 'System' as the processor since it's automatic
            await this.processRefund(returnRequest._id, null, 'System');
            // Refresh with latest status if needed, though processRefund updates it
        } catch (err) {
            console.error('Auto-refund failed:', err);
            // Don't fail the request creation, but log it. Admin can retry.
            returnRequest.refundStatus = 'failed';
            await returnRequest.save();
        }

        return returnRequest;
    }

    /**
     * Update return status (Approve/Reject)
     */
    async updateStatus(requestId, status, actorId, actorModel, note = '', rejectionReason = '') {
        const returnRequest = await ReturnRequest.findById(requestId);
        if (!returnRequest) throw new Error('Return request not found');

        returnRequest.status = status;
        returnRequest.statusHistory.push({
            status,
            changedBy: actorId,
            changedByModel: actorModel,
            note
        });

        if (status === 'rejected') {
            returnRequest.rejectionReason = rejectionReason;
            returnRequest.refundStatus = 'failed';
        }

        if (actorModel === 'Admin') returnRequest.adminNotes = note;
        if (actorModel === 'Vendor') returnRequest.vendorNotes = note;

        await returnRequest.save();

        await notificationService.createNotification({
            recipientId: returnRequest.customerId,
            recipientType: 'user',
            title: `Return Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your return request ${returnRequest.returnCode} has been ${status}.`,
            type: 'return_request', // Enum valid
            relatedId: returnRequest._id,
            onModel: 'ReturnRequest'
        });

        return returnRequest;
    }

    /**
     * Process Refund
     */
    async processRefund(requestId, processedBy, processedByModel) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const returnRequest = await ReturnRequest.findById(requestId).session(session);
            if (!returnRequest) throw new Error('Return request not found');

            if (returnRequest.refundStatus === 'processed') throw new Error('Refund already processed');
            if (returnRequest.status !== 'approved' && returnRequest.status !== 'completed') {
                returnRequest.status = 'completed';
            }

            const refundCode = await this.generateRefundCode();

            await session.abortTransaction();

            const walletTx = await createWalletTransaction(
                returnRequest.customerId,
                'credit',
                returnRequest.refundAmount,
                `Refund for return ${returnRequest.returnCode}`,
                returnRequest.orderId.toString(),
                'refund'
            );

            if (returnRequest.vendorId) {
                // Use debitPendingOrBalance instead of forced debitWallet
                await VendorWalletService.debitPendingOrBalance(
                    returnRequest.vendorId,
                    returnRequest.refundAmount,
                    `Refund deduction for return ${returnRequest.returnCode}`,
                    returnRequest.orderId.toString(),
                    'refund'
                );
            }

            const refundTransaction = await RefundTransaction.create({
                refundCode,
                returnRequestId: returnRequest._id,
                orderId: returnRequest.orderId,
                customerId: returnRequest.customerId,
                vendorId: returnRequest.vendorId,
                amount: returnRequest.refundAmount,
                method: 'wallet',
                status: 'completed',
                walletTransactionId: walletTx._id || walletTx.id,
                processedBy,
                processedByModel,
                processedAt: new Date()
            });

            returnRequest.refundStatus = 'processed';
            returnRequest.refundTransactionId = refundTransaction._id;
            returnRequest.status = 'completed';
            returnRequest.statusHistory.push({
                status: 'completed',
                changedBy: processedBy,
                changedByModel: processedByModel,
                note: 'Refund processed successfully'
            });
            await returnRequest.save();

            await Order.findByIdAndUpdate(returnRequest.orderId, {
                'cancellation.refundStatus': 'completed',
                'cancellation.refundAmount': returnRequest.refundAmount
            });

            await notificationService.createNotification({
                recipientId: returnRequest.customerId,
                recipientType: 'user',
                title: 'Refund Processed',
                message: `Refund of ₹${returnRequest.refundAmount} has been credited to your wallet.`,
                type: 'payment_success', // Enum valid (closest match for wallet credit)
                relatedId: refundTransaction._id,
                onModel: 'RefundTransaction'
            });

            // RESTORE STOCK on Refund/Return completion
            if (returnRequest.items && returnRequest.items.length > 0) {
                for (const item of returnRequest.items) {
                    if (item.productId) {
                        // Restore main stock (Total Aggregated Stock)
                        // We increment stockQuantity by the returned quantity
                        await Product.findByIdAndUpdate(
                            item.productId,
                            { $inc: { stockQuantity: item.quantity } },
                            { session }
                        );

                        // Note: Specific variant stock restoration is not implemented 
                        // because ReturnRequest items do not currently persist variant selection (color/size).
                        // However, maintaining the Total Stock accuracy is the primary requirement.
                    }
                }
            }

            return returnRequest;

        } catch (error) {
            if (session.inTransaction()) await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Getters
    async getUserReturns(userId, filters = {}) {
        return await ReturnRequest.find({ customerId: userId })
            .populate('items.productId', 'name images price')
            .sort({ createdAt: -1 });
    }

    async getVendorReturns(vendorId, filters = {}) {
        const query = { vendorId };
        if (filters.status) query.status = filters.status;
        return await ReturnRequest.find(query)
            .populate('customerId', 'name email phone')
            .populate('items.productId', 'name images price')
            .sort({ createdAt: -1 });
    }

    async getAdminReturns(filters = {}) {
        const query = {};
        if (filters.status) query.status = filters.status;
        return await ReturnRequest.find(query)
            .populate('customerId', 'name email')
            .populate('vendorId', 'businessName')
            .populate('items.productId', 'name images price')
            .sort({ createdAt: -1 });
    }

    async deleteByOrderId(orderId) {
        return await ReturnRequest.deleteMany({ orderId });
    }
}

export default new ReturnService();

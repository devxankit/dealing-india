import ReturnRequest from '../models/ReturnRequest.model.js';
import ReturnPolicyConfig from '../models/ReturnPolicyConfig.model.js';
import RefundTransaction from '../models/RefundTransaction.model.js';
import Order from '../models/Order.model.js';
import { createWalletTransaction } from './wallet.service.js';
import VendorWalletService from './vendorWallet.service.js';
import notificationService from './notification.service.js';
import mongoose from 'mongoose';

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

    /**
     * Check return eligibility for an order
     */
    async checkEligibility(orderId) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');

        if (order.status !== 'delivered') {
            return { eligible: false, reason: 'Order not delivered yet' };
        }

        const config = await this.getPolicyConfig();
        const deliveryDate = new Date(order.tracking?.deliveredAt || order.updatedAt);
        const now = new Date();
        const diffTime = Math.abs(now - deliveryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > config.returnWindowDays) {
            return {
                eligible: false,
                reason: `Return window closed. Policy allows returns within ${config.returnWindowDays} days of delivery.`,
                daysPassed: diffDays
            };
        }

        // Check if already returned
        const existingReturn = await ReturnRequest.findOne({ orderId, status: { $nin: ['cancelled', 'rejected'] } });
        if (existingReturn) {
            return { eligible: false, reason: 'Return request already exists for this order' };
        }

        return { eligible: true, daysRemaining: config.returnWindowDays - diffDays + 1 };
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

        // 3. Check Auto-Approval
        const config = await this.getPolicyConfig();
        let initialStatus = 'pending';
        let refundStatus = 'pending';

        if (config.autoApproveEnabled && totalRefundAmount <= config.autoApproveMaxAmount) {
            initialStatus = 'approved';
        }

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
            recipient: userId,
            recipientModel: 'User',
            title: 'Return Request Submitted',
            message: `Your return request ${returnCode} has been submitted.`,
            type: 'order',
            relatedId: returnRequest._id,
            onModel: 'ReturnRequest'
        });

        if (vendorId) {
            await notificationService.createNotification({
                recipient: vendorId,
                recipientModel: 'Vendor',
                title: 'New Return Request',
                message: `New return request ${returnCode} for Order ${order.orderCode}`,
                type: 'order',
                relatedId: returnRequest._id,
                onModel: 'ReturnRequest'
            });
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
            recipient: returnRequest.customerId,
            recipientModel: 'User',
            title: `Return Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your return request ${returnRequest.returnCode} has been ${status}.`,
            type: 'order',
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
                await VendorWalletService.debitWallet(
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
                recipient: returnRequest.customerId,
                recipientModel: 'User',
                title: 'Refund Processed',
                message: `Refund of ₹${returnRequest.refundAmount} has been credited to your wallet.`,
                type: 'wallet',
                relatedId: refundTransaction._id,
                onModel: 'RefundTransaction'
            });

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
        return await ReturnRequest.find({ customerId: userId }).sort({ createdAt: -1 });
    }

    async getVendorReturns(vendorId, filters = {}) {
        const query = { vendorId };
        if (filters.status) query.status = filters.status;
        return await ReturnRequest.find(query)
            .populate('customerId', 'name email phone')
            .sort({ createdAt: -1 });
    }

    async getAdminReturns(filters = {}) {
        const query = {};
        if (filters.status) query.status = filters.status;
        return await ReturnRequest.find(query)
            .populate('customerId', 'name email')
            .populate('vendorId', 'businessName')
            .sort({ createdAt: -1 });
    }
}

export default new ReturnService();

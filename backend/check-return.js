import mongoose from 'mongoose';
import connectDB from './config/database.js';
import Order from './models/Order.model.js';
import VendorWallet from './models/VendorWallet.model.js';
import ReturnRequest from './models/ReturnRequest.model.js';
import returnService from './services/return.service.js';
import dotenv from 'dotenv';

dotenv.config();

const verifyReturnFlow = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Starting return verification...');

        // 1. Find a delivered order eligible for return (within window)
        // We can reuse the order we just delivered in previous test if check-flow.js was run
        // Or find any delivered order.
        const order = await Order.findOne({ status: 'delivered' }).sort({ updatedAt: -1 });

        if (!order) {
            console.log('No delivered order found. Please run check-flow.js first.');
            process.exit(0);
        }

        console.log(`Testing with Order #${order.orderCode} (ID: ${order._id})`);

        // Ensure order is owned by a user
        if (!order.customerId) {
            console.error('Order has no customerId.');
            process.exit(1);
        }

        const vendorId = order.vendorBreakdown[0]?.vendorId;
        const initialWallet = await VendorWallet.findOne({ vendorId });
        console.log(`Initial Vendor Wallet - Pending: ${initialWallet.pendingBalance}, Balance: ${initialWallet.balance}`);

        // 2. Create Return Request Payload
        const returnItem = order.items[0]; // Return the first item
        const returnData = {
            orderId: order._id,
            items: [{
                productId: returnItem.productId.toString(), // or ID if populated
                itemId: returnItem._id?.toString(), // some schema structures use itemId
                quantity: 1,
                reason: 'defective'
            }],
            reason: 'Defective item',
            description: 'Item arrived broken',
            refundMethod: 'wallet'
        };

        // Note: createReturnRequest expects (userId, returnData)
        // We simulate the customer making the request
        console.log('Creating return request...');
        const result = await returnService.createReturnRequest(order.customerId.toString(), returnData);

        console.log(`Return Request Created: ${result.returnCode}`);
        console.log(`Status: ${result.status}`);
        console.log(`Refund Status: ${result.refundStatus}`);

        // 3. Verify Results
        const freshReturn = await ReturnRequest.findById(result._id);
        const updatedWallet = await VendorWallet.findOne({ vendorId });

        console.log(`Final Return Status: ${freshReturn.status}`);
        console.log(`Final Refund Status: ${freshReturn.refundStatus}`);
        console.log(`Updated Vendor Wallet - Pending: ${updatedWallet.pendingBalance}, Balance: ${updatedWallet.balance}`);

        if (freshReturn.status === 'completed' && freshReturn.refundStatus === 'processed') {
            console.log('SUCCESS: Return request was auto-approved and refund processed.');
        } else {
            console.error('FAILED: Return was not auto-processed.');
        }

        // Check if debited from pending
        if (updatedWallet.pendingBalance < initialWallet.pendingBalance) {
            console.log('SUCCESS: Funds debited from Pending Balance.');
        } else if (updatedWallet.balance < initialWallet.balance) {
            console.log('SUCCESS: Funds debited from Main Balance (fallback).');
        } else {
            console.error('FAILED: No funds debited from vendor wallet!');
        }

        process.exit(0);
    } catch (err) {
        console.error('Return verification error:', err);
        process.exit(1);
    }
};

verifyReturnFlow();

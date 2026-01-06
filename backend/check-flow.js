import mongoose from 'mongoose';
import connectDB from './config/database.js';
import Order from './models/Order.model.js';
import VendorWallet from './models/VendorWallet.model.js';
import { updateOrderStatus } from './services/order.service.js';
import dotenv from 'dotenv';

dotenv.config();

const verifyFlow = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Starting verification...');

        // 1. Find a pending or processing order to test with
        const order = await Order.findOne({ status: { $in: ['pending', 'processing'] } });
        if (!order) {
            console.log('No eligible order found for testing. Please place an order first.');
            process.exit(0);
        }

        console.log(`Testing with Order #${order.orderCode} (ID: ${order._id})`);
        const vendorId = order.vendorBreakdown[0]?.vendorId;
        if (!vendorId) {
            console.error('Order has no vendor breakdown. Cannot test wallet logic.');
            process.exit(1);
        }

        // 2. Check initial wallet state
        let wallet = await VendorWallet.findOne({ vendorId });
        const initialPending = wallet?.pendingBalance || 0;
        const initialBalance = wallet?.balance || 0;
        console.log(`Initial Wallet - Pending: ${initialPending}, Balance: ${initialBalance}`);

        const adminId = '694cd4544d8c7e7472cff1ed';

        // 3. Mark order as delivered
        console.log('Marking order as delivered...');
        await updateOrderStatus(order._id, 'delivered', adminId, 'admin', 'Verification test');

        // 4. Verify order model updates
        const updatedOrder = await Order.findById(order._id);
        console.log('Order Updated - returnWindowExpiresAt:', updatedOrder.returnWindowExpiresAt);
        console.log('Order Updated - fundsReleased:', updatedOrder.fundsReleased);

        if (!updatedOrder.returnWindowExpiresAt) {
            console.error('FAILED: returnWindowExpiresAt not set!');
        }

        // 5. Verify wallet updates
        wallet = await VendorWallet.findOne({ vendorId });
        const newPending = wallet.pendingBalance;
        console.log(`Updated Wallet - Pending: ${newPending}, Balance: ${wallet.balance}`);

        if (newPending > initialPending) {
            console.log('SUCCESS: Pending balance increased.');
        } else {
            console.error('FAILED: Pending balance did not increase!');
        }

        console.log('Verification script completed.');
        process.exit(0);
    } catch (err) {
        console.error('Verification error:', err);
        process.exit(1);
    }
};

verifyFlow();

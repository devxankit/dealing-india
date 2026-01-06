import mongoose from 'mongoose';
import connectDB from './config/database.js';
import Order from './models/Order.model.js';
import VendorWallet from './models/VendorWallet.model.js';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const testRelease = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Starting release verification...');

        // 1. Find the order that was recently delivered
        const order = await Order.findOne({ status: 'delivered', fundsReleased: false }).sort({ updatedAt: -1 });
        if (!order) {
            console.log('No eligible order found. Run check-flow.js first.');
            process.exit(0);
        }

        console.log(`Testing release for Order #${order.orderCode} (ID: ${order._id})`);

        // 2. Move expiration date to past
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        order.returnWindowExpiresAt = pastDate;
        await order.save();
        console.log('Set returnWindowExpiresAt to the past:', pastDate);

        const vendorId = order.vendorBreakdown[0]?.vendorId;
        let wallet = await VendorWallet.findOne({ vendorId });
        const pendingBefore = wallet.pendingBalance;
        const balanceBefore = wallet.balance;
        console.log(`Initial - Pending: ${pendingBefore}, Balance: ${balanceBefore}`);

        // 3. Run the release script
        console.log('Running release-pending-funds.js...');
        const scriptPath = path.join(process.cwd(), 'scripts', 'release-pending-funds.js');

        const child = spawn('node', [scriptPath]);

        child.stdout.on('data', (data) => console.log(`Script OUT: ${data}`));
        child.stderr.on('data', (data) => console.error(`Script ERR: ${data}`));

        child.on('close', async (code) => {
            console.log(`Release script exited with code ${code}`);

            if (code === 0) {
                // 4. Verify results
                const updatedOrder = await Order.findById(order._id);
                wallet = await VendorWallet.findOne({ vendorId });

                console.log('Order fundsReleased:', updatedOrder.fundsReleased);
                console.log(`Updated Wallet - Pending: ${wallet.pendingBalance}, Balance: ${wallet.balance}`);

                if (updatedOrder.fundsReleased && wallet.balance > balanceBefore && wallet.pendingBalance < pendingBefore) {
                    console.log('SUCCESS: Funds transferred from pending to available balance.');
                } else {
                    console.error('FAILED: Funds were not released correctly.');
                }
            }
            process.exit(0);
        });

    } catch (err) {
        console.error('Release test error:', err);
        process.exit(1);
    }
};

testRelease();

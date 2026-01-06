import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import vendorWalletService from '../services/vendorWallet.service.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to release pending funds for orders that have passed the 7-day return window.
 * This should be run as a cron job (daily).
 */
const releasePendingFunds = async () => {
    try {
        await connectDB();
        console.log('Starting pending funds release process...');

        const now = new Date();

        // Find delivered orders where return window has expired and funds haven't been released
        const orders = await Order.find({
            status: 'delivered',
            returnWindowExpiresAt: { $lte: now },
            fundsReleased: { $ne: true }
        });

        console.log(`Found ${orders.length} orders eligible for fund release.`);

        let processedCount = 0;
        let totalReleased = 0;

        for (const order of orders) {
            console.log(`Processing Order #${order.orderCode}...`);

            if (!order.vendorBreakdown || order.vendorBreakdown.length === 0) {
                console.warn(`Order #${order.orderCode} has no vendor breakdown. Marking as released anyway.`);
                order.fundsReleased = true;
                await order.save();
                continue;
            }

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                for (const vb of order.vendorBreakdown) {
                    if (vb.vendorId) {
                        // Calculate earnings: Subtotal - Commission
                        const earnings = (vb.subtotal || 0) - (vb.commission || 0);

                        if (earnings > 0) {
                            await vendorWalletService.releasePendingFunds(
                                vb.vendorId,
                                earnings,
                                `Return window expired for Order #${order.orderCode}`,
                                order._id
                            );
                            totalReleased += earnings;
                        }
                    }
                }

                order.fundsReleased = true;
                await order.save({ session });

                await session.commitTransaction();
                processedCount++;
                console.log(`Successfully released funds for Order #${order.orderCode}`);
            } catch (err) {
                await session.abortTransaction();
                console.error(`Failed to release funds for Order #${order.orderCode}:`, err.message);
            } finally {
                session.endSession();
            }
        }

        console.log(`Process completed. Processed ${processedCount}/${orders.length} orders. Total released: ₹${totalReleased.toFixed(2)}`);
        process.exit(0);
    } catch (error) {
        console.error('Fatal error in fund release script:', error);
        process.exit(1);
    }
};

releasePendingFunds();

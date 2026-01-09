import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

// Define Schemas (Simplified for query purposes if models import fails, but let's try importing first)
// To avoid module resolution issues, I'll define minimal schemas here or try to import.
// Importing is risky if dependencies are complex. Let's try importing first.
import Order from './models/Order.model.js';
import Product from './models/Product.model.js';
import Vendor from './models/Vendor.model.js';

const run = async () => {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing in env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Find the vendor "Solemet"
        const targetVendor = await Vendor.findOne({ storeName: 'Solemet' });

        if (!targetVendor) {
            console.log('Vendor "Solemet" NOT FOUND in DB.');
            return;
        }

        console.log(`\nAnalyzing Vendor: ${targetVendor.storeName} (${targetVendor._id})`);

        // 2. Find Products
        const products = await Product.find({ vendorId: targetVendor._id });
        console.log(`Found ${products.length} products for this vendor.`);
        const productIds = products.map(p => p._id);
        const productIdsStrings = products.map(p => p._id.toString());

        // 3. Find Orders
        // We'll mimic the controller logic strict filtering
        const orders = await Order.find({
            $or: [
                { 'vendorBreakdown.vendorId': targetVendor._id },
                { 'items.productId': { $in: productIds } }
            ],
            status: { $nin: ['cancelled', 'returned', 'refunded'] }
        }).lean();

        console.log(`Found ${orders.length} orders matching criteria.`);

        // 4. Detailed Order Analysis
        orders.forEach(order => {
            console.log(`\nOrder: ${order.orderCode} (${order._id})`);
            console.log(`  Status: ${order.status}`);

            // Vendor Breakdown check
            if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
                console.log('  Has VendorBreakdown:', JSON.stringify(order.vendorBreakdown));
                const match = order.vendorBreakdown.find(vb => vb.vendorId && vb.vendorId.toString() === targetVendor._id.toString());
                if (match) {
                    console.log('  -> Match in Breakdown! Subtotal:', match.subtotal);
                } else {
                    console.log('  -> No match in Breakdown for this vendor.');
                }
            } else {
                console.log('  No VendorBreakdown.');
            }

            // Items check
            let calcSubtotal = 0;
            let hasItems = false;
            order.items.forEach(item => {
                const pId = item.productId ? (item.productId._id || item.productId).toString() : 'null';
                const isMatch = productIdsStrings.includes(pId);
                // console.log(`    Item: ${item.name} (${pId}) - Match? ${isMatch}`);
                if (isMatch) {
                    hasItems = true;
                    calcSubtotal += (item.price || 0) * (item.quantity || 1);
                }
            });

            if (hasItems) {
                console.log(`  -> Calculated Subtotal from Items: ${calcSubtotal}`);
            } else {
                console.log('  -> No items match this vendor.');
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

run();

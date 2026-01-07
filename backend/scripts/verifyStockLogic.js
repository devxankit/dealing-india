import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from backend root
dotenv.config({ path: join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import { createOrder, cancelOrder } from '../services/order.service.js';

const PRODUCT_ID = '695d55c138659675f63447c9';

const runVerification = async () => {
    try {
        console.log('🔌 Connecting to DB...');
        await connectDB();
        console.log('✅ Connected.');

        // 1. Get User
        const user = await User.findOne({ role: 'user' });
        if (!user) {
            throw new Error('No user found to create order');
        }
        console.log(`👤 Using User: ${user.name} (${user._id})`);

        // 2. Get Initial Stock
        let product = await Product.findById(PRODUCT_ID);
        if (!product) throw new Error('Product not found');

        // Helper to calc total stock sum
        const calculateStock = (p) => {
            const main = p.stockQuantity || 0;
            let variants = 0;
            if (p.variants?.colorVariants) {
                p.variants.colorVariants.forEach(cv => {
                    if (cv.color !== p.primaryColorName && cv.colorName !== p.primaryColorName) {
                        variants += cv.sizeVariants?.reduce((acc, sv) => acc + (sv.stockQuantity || 0), 0) || 0;
                    }
                });
            }
            return { main, variants, total: main + variants };
        };

        const initial = calculateStock(product);
        console.log(`📊 Initial Stock: Main=${initial.main}, Variants=${initial.variants}, Total=${initial.total}`);

        // 3. Create Order
        console.log('🛒 Creating Order (Qty: 1)...');
        const orderData = {
            customerId: user._id,
            items: [{
                productId: PRODUCT_ID, // Main product selection (no variant details implies main)
                quantity: 1,
                name: product.name,
                price: product.price
            }],
            total: product.price,
            subtotal: product.price,
            paymentMethod: 'cod',
            shippingAddress: {
                name: 'Test', address: 'Test', city: 'Test', state: 'Test', zipCode: '123456', phone: '1234567890'
            } // Mock address data
        };

        // Pass null for io
        const order = await createOrder(orderData, null);
        console.log(`✅ Order Created: ${order.orderCode} (${order._id})`);

        // 4. Check Stock After Order
        product = await Product.findById(PRODUCT_ID);
        const afterOrder = calculateStock(product);
        console.log(`📉 Stock After Order: Main=${afterOrder.main}, Variants=${afterOrder.variants}, Total=${afterOrder.total}`);

        if (afterOrder.main === initial.main - 1) {
            console.log('✅ PASS: Main User Stock decremented by 1.');
        } else {
            console.error('❌ FAIL: Main Stock did not decrement correctly.');
        }

        // 5. Cancel Order
        console.log('🚫 Cancelling Order...');
        await cancelOrder(order._id, user._id);
        console.log('✅ Order Cancelled.');

        // 6. Check Stock After Cancel
        product = await Product.findById(PRODUCT_ID);
        const afterCancel = calculateStock(product);
        console.log(`📈 Stock After Cancel: Main=${afterCancel.main}, Variants=${afterCancel.variants}, Total=${afterCancel.total}`);

        if (afterCancel.main === initial.main) {
            console.log('✅ PASS: Stock restored to initial value.');
        } else {
            console.error('❌ FAIL: Stock did not restore correctly.');
        }

    } catch (err) {
        console.error('❌ Error during verification:', err);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected.');
        process.exit(0);
    }
};

runVerification();

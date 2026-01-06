
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ReturnRequest from '../models/ReturnRequest.model.js';
import Product from '../models/Product.model.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// Handle env var name mismatch
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const fixData = async () => {
    await connectDB();

    try {
        const returns = await ReturnRequest.find({});
        console.log(`Found ${returns.length} return requests.`);

        for (const req of returns) {
            console.log(`Processing Return: ${req.returnCode}...`);

            if (!req.vendorId) {
                console.log(`  -> Missing vendorId. Attempting to fix...`);

                if (req.items && req.items.length > 0) {
                    const productId = req.items[0].productId;
                    console.log(`  -> Looking up product: ${productId}`);
                    const product = await Product.findById(productId);

                    if (product && product.vendorId) {
                        console.log(`  -> Found Vendor: ${product.vendorId}. Updating...`);
                        req.vendorId = product.vendorId;
                        await req.save();
                        console.log(`  -> FIXED! ✅`);
                    } else {
                        console.log(`  -> Product or Vendor not found. Cannot fix. ❌`);
                    }
                } else {
                    console.log(`  -> No items in request. Cannot determine vendor.`);
                }
            } else {
                console.log(`  -> vendorId already exists. Skipping.`);
            }
        }
        console.log('\nDone!');

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
};

fixData();

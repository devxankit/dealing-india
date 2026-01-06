
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ReturnRequest from '../models/ReturnRequest.model.js';
import Product from '../models/Product.model.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('CWD:', process.cwd());
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

const checkData = async () => {
    await connectDB();

    try {
        const returns = await ReturnRequest.find({});
        console.log(`Found ${returns.length} return requests.`);

        for (const req of returns) {
            console.log(`\nReturn ID: ${req.returnCode} (${req._id})`);
            console.log(`  - Customer: ${req.customerId}`);
            console.log(`  - Vendor ID: ${req.vendorId}`);
            console.log(`  - Status: ${req.status}`);

            if (req.items && req.items.length > 0) {
                console.log(`  - Product ID: ${req.items[0].productId}`);
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
};

checkData();

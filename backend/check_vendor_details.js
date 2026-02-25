import mongoose from 'mongoose';
import Vendor from './models/Vendor.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const vendor = await Vendor.findById('699db332b615a69b7281e514').select('name businessType address');
        console.log(JSON.stringify(vendor, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();

import mongoose from 'mongoose';
import Vendor from './models/Vendor.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const vendors = await Vendor.find({ 'address.city': /Surat/i }).select('name businessType status isActive address');
        console.log(JSON.stringify(vendors, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();

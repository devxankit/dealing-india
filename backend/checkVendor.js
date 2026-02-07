import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from './models/Vendor.model.js';

dotenv.config();

const checkVendor = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const vendorId = '696a0acd04eb902a084a5132';
        const vendor = await Vendor.findById(vendorId);

        if (vendor) {
            console.log('Vendor Found:', {
                id: vendor._id,
                storeName: vendor.storeName,
                vendorType: vendor.vendorType,
                status: vendor.status,
                isActive: vendor.isActive
            });
        } else {
            console.log('Vendor NOT found in DB');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkVendor();

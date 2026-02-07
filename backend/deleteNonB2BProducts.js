import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from './models/Vendor.model.js';
import Product from './models/Product.model.js';

dotenv.config();

const cleanupProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get all B2B vendor IDs
        const b2bVendors = await Vendor.find({ vendorType: 'b2b' }).select('_id');
        const b2bIds = b2bVendors.map(v => v._id);

        console.log(`Found ${b2bIds.length} B2B vendors.`);

        // 2. Count products that don't belong to these vendors
        const productsToDeleteCount = await Product.countDocuments({ vendorId: { $nin: b2bIds } });
        console.log(`Total products that are NOT B2B: ${productsToDeleteCount}`);

        if (productsToDeleteCount === 0) {
            console.log('No products to delete. All products belong to B2B vendors.');
            process.exit(0);
        }

        // 3. Delete those products
        const result = await Product.deleteMany({ vendorId: { $nin: b2bIds } });
        console.log(`Successfully deleted ${result.deletedCount} products.`);

        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanupProducts();

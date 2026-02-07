import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from './models/Vendor.model.js';
import Product from './models/Product.model.js';

dotenv.config();

const inspectVendorsAndProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const totalVendors = await Vendor.countDocuments();
        const b2bVendors = await Vendor.countDocuments({ vendorType: 'b2b' });
        const nonB2BVendors = await Vendor.countDocuments({ vendorType: { $ne: 'b2b' } });

        console.log(`Total Vendors: ${totalVendors}`);
        console.log(`B2B Vendors: ${b2bVendors}`);
        console.log(`Non-B2B Vendors: ${nonB2BVendors}`);

        const totalProducts = await Product.countDocuments();
        console.log(`Total Products: ${totalProducts}`);

        // Find products belonging to non-B2B vendors
        const nonB2BVendorIds = await Vendor.find({ vendorType: { $ne: 'b2b' } }).select('_id');
        const ids = nonB2BVendorIds.map(v => v._id);

        const productsOfNonB2B = await Product.countDocuments({ vendorId: { $in: ids } });
        console.log(`Products belonging to non-B2B vendors: ${productsOfNonB2B}`);

        // Also check products with missing or invalid vendorId
        const allProducts = await Product.find({}).select('vendorId');
        let orphanProducts = 0;
        for (const product of allProducts) {
            if (!product.vendorId) {
                orphanProducts++;
                continue;
            }
            const vendor = await Vendor.findById(product.vendorId);
            if (!vendor || vendor.vendorType !== 'b2b') {
                // Already counted some above, but this catch orphans too
            }
        }

        // Let's do a more robust check for counts
        const b2bVendorIds = await Vendor.find({ vendorType: 'b2b' }).select('_id');
        const b2bIds = b2bVendorIds.map(v => v._id);

        const productsToKeep = await Product.countDocuments({ vendorId: { $in: b2bIds } });
        const productsToDelete = await Product.countDocuments({ vendorId: { $nin: b2bIds } });

        console.log(`Products to KEEP (B2B): ${productsToKeep}`);
        console.log(`Products to DELETE (Regular/Orphan): ${productsToDelete}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

inspectVendorsAndProducts();

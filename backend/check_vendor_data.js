
import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
    name: String,
    vendorType: String,
    isActive: Boolean,
    status: String,
    businessType: String,
    address: {
        market: String,
        state: String,
        city: String,
        area: String
    }
}, { strict: false });

const productSchema = new mongoose.Schema({
    vendorId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
    isVisible: Boolean
}, { strict: false });

const Vendor = mongoose.model('Vendor', vendorSchema, 'vendors');
const Product = mongoose.model('Product', productSchema, 'products');

const MONGO_URI = 'mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia';

async function checkData() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Find all B2B vendors
        const vendors = await Vendor.find({ vendorType: 'b2b' }).lean();
        console.log(`Found ${vendors.length} B2B vendors.`);

        for (const v of vendors) {
            console.log(`\nVendor: ${v.name} (${v._id})`);
            console.log(`  isActive: ${v.isActive}, status: ${v.status}, businessType: "${v.businessType}"`);
            console.log(`  Address:`, JSON.stringify(v.address));
            if (v.address && v.address.market) {
                console.log(`  ✅ Market Field present: "${v.address.market}"`);
            } else {
                console.log(`  ❌ Market Field: MISSING or EMPTY`);
            }
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

checkData();

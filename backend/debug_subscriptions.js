import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI;

const run = async () => {
    try {
        if (!MONGO_URI) {
            console.error('MONGODB_URI not found in .env');
            process.exit(1);
        }
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Define temporary schemas to avoid import issues
        const VendorSubscription = mongoose.model('VendorSubscription', new mongoose.Schema({
            vendorId: mongoose.Schema.Types.ObjectId,
            planId: mongoose.Schema.Types.ObjectId,
            tierId: mongoose.Schema.Types.ObjectId,
            status: String,
            startDate: Date,
            endDate: Date,
            autoRenew: Boolean,
            amount: Number,
            razorpayPaymentId: String
        }, { strict: false }));

        const Vendor = mongoose.model('Vendor', new mongoose.Schema({
            name: String,
            storeName: String,
            businessType: String
        }, { strict: false }));

        const B2BPlan = mongoose.model('B2BSubscriptionPlan', new mongoose.Schema({
            name: String,
            price: Number,
            duration: Number
        }, { strict: false }));

        const subscriptions = await VendorSubscription.find({}).lean();

        console.log(`DATA_START`);
        console.log(`Total Found: ${subscriptions.length}`);

        for (const sub of subscriptions) {
            const vendor = await Vendor.findById(sub.vendorId).lean();
            const plan = sub.planId ? await B2BPlan.findById(sub.planId).lean() : null;

            console.log(`- SUB_ID: ${sub._id}`);
            console.log(`  Vendor: ${vendor?.storeName || vendor?.name || 'Unknown'}`);
            console.log(`  Status: ${sub.status}`);
            console.log(`  Industry: ${vendor?.businessType || 'N/A'}`);
            console.log(`  PlanName: ${plan?.name || 'N/A'}`);
            console.log(`  AutoRenew: ${sub.autoRenew}`);
            console.log(`  End: ${sub.endDate}`);
        }
        console.log(`DATA_END`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();

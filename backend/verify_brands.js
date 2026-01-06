
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const verify = async () => {
    await connectDB();

    try {
        // Import Models directly to ensure schema registration
        const Product = mongoose.model('Product', new mongoose.Schema({
            name: String,
            brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
            createdAt: Date
        }, { strict: false })); // Use strict false to see all fields

        const Brand = mongoose.model('Brand', new mongoose.Schema({
            name: String,
            isActive: Boolean,
            createdAt: Date
        }, { strict: false }));

        console.log('\n--- Recent Brands ---');
        const brands = await Brand.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log(JSON.stringify(brands, null, 2));

        console.log('\n--- Recent Products ---');
        const products = await Product.find().sort({ createdAt: -1 }).limit(5).populate('brandId').lean();

        products.forEach(p => {
            console.log(`Product: ${p.name} (_id: ${p._id})`);
            console.log(`  BrandId Field:`, p.brandId);
            if (p.brandId) {
                console.log(`  Populated Brand Name: ${p.brandId.name}`);
            } else {
                console.log(`  Brand Not Populated/Null`);
            }
            console.log('---');
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

verify();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const returnRequestSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'pending' },
    refundAmount: Number
}, { timestamps: true, strict: false }); // Strict false to catch everything

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const returns = await ReturnRequest.find({});
        console.log(`Found ${returns.length} requests.`);
        console.log(JSON.stringify(returns, null, 2));

        const target = '695cc2aab0ae56e5cfb7df92';
        const deleted = await ReturnRequest.deleteMany({ orderId: target });
        console.log(`Deleted ${deleted.deletedCount} requests for order ${target}`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
};

run();

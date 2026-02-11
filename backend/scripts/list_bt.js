import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const BusinessTypeSchema = new mongoose.Schema({
    name: String,
    slug: String,
    subTypes: [String]
}, { strict: false });

const BusinessType = mongoose.model('BusinessType', BusinessTypeSchema);

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const allTypes = await BusinessType.find().lean();
        console.log('All BusinessTypes:');
        console.log(JSON.stringify(allTypes, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();

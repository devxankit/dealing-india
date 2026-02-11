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

async function updateData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const grayBroker = await BusinessType.findOne({ slug: 'gray-broker' });

        if (grayBroker) {
            const newSubTypes = [
                "Knighting gray",
                "Malegaon gray",
                "Ichakkaranji Gray",
                "Erod gray",
                "Tirupar Gray"
            ];

            // Add only if not already present
            newSubTypes.forEach(type => {
                if (!grayBroker.subTypes.includes(type)) {
                    grayBroker.subTypes.push(type);
                }
            });

            await grayBroker.save();
            console.log('Successfully updated GRAY BROKER sub-types');
            console.log('Current sub-types:', grayBroker.subTypes);
        } else {
            console.log('GRAY BROKER not found');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

updateData();

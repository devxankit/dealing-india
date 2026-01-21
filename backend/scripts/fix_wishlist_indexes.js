import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const restoreIndexes = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const collection = mongoose.connection.collection('wishlists');
        const indexes = await collection.indexes();

        console.log('Current Indexes:');
        console.log(JSON.stringify(indexes, null, 2));

        // Check for "user" index
        const userIndex = indexes.find(idx => idx.key.user !== undefined);

        if (userIndex) {
            console.log(`Found problematic index: ${userIndex.name}. Dropping...`);
            await collection.dropIndex(userIndex.name);
            console.log('Index dropped successfully.');
        } else {
            console.log('No index on "user" field found.');
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

restoreIndexes();

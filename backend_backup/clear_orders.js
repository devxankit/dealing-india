import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function clearAllOrders() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!\n');

        // Get native MongoDB connection
        const db = mongoose.connection.db;

        // Collections to clear for complete order flow reset
        const collections = [
            'orders',
            'returnrequests',
            'refundtransactions',
            'carts',
            'vendorwallettransactions',
            'wallettransactions',
            'transactions'
        ];

        console.log('🗑️  Clearing order-related collections...\n');

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                const countBefore = await collection.countDocuments();

                if (countBefore > 0) {
                    const result = await collection.deleteMany({});
                    console.log(`   ✅ ${collectionName}: Deleted ${result.deletedCount} documents`);
                } else {
                    console.log(`   ⏭️  ${collectionName}: Already empty`);
                }
            } catch (err) {
                console.log(`   ⚠️  ${collectionName}: Collection may not exist or error - ${err.message}`);
            }
        }

        console.log('\n🎉 All order-related data cleared successfully!');
        console.log('📝 You can now test the complete order flow from scratch.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

clearAllOrders();

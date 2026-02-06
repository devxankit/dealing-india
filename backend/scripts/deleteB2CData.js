import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    const db = mongoose.connection.db;

    console.log('⚠️  CRITICAL: Starting B2C data deletion...');
    console.log('This will PERMANENTLY delete all B2C users, orders, and related data.');
    console.log('Ensure you have run archiveB2CData.js first!');
    console.log('Press Ctrl+C within 10 seconds to cancel...');

    await new Promise(resolve => setTimeout(resolve, 10000));

    const collectionsToDrop = [
        'users',
        'carts',
        'orders',
        'wishlists',
        'wallets',
        'wallettransactions',
        'addresses',
        'b2csubscriptions',
        'subscriptiontiers',
        'promotionalreels',
        'reelcomments',
        'reellikes',
        'megarewardentries',
        'megarewardsharelinks',
        'megarewardclicklogs',
        'promotionalreels'
    ];

    for (const collName of collectionsToDrop) {
        try {
            const exists = await db.listCollections({ name: collName }).hasNext();
            if (exists) {
                await db.collection(collName).drop();
                console.log(`✓ Dropped collection: ${collName}`);
            } else {
                console.log(`⊘ Collection not found: ${collName}`);
            }
        } catch (err) {
            console.error(`✗ Error dropping ${collName}:`, err.message);
        }
    }

    // Clean Mixed Collections
    console.log('Cleaning mixed collections...');

    // 1. User Reels
    const reelsResult = await db.collection('reels').deleteMany({ userId: { $exists: true } });
    console.log(`✓ Deleted ${reelsResult.deletedCount} user-created reels`);

    // 2. B2C Products (from B2C vendors)
    const b2cVendors = await db.collection('vendors').find({ vendorType: 'b2c' }).project({ _id: 1 }).toArray();
    const b2cVendorIds = b2cVendors.map(v => v._id);
    const prodResult = await db.collection('products').deleteMany({ vendorId: { $in: b2cVendorIds } });
    console.log(`✓ Deleted ${prodResult.deletedCount} products from B2C vendors`);

    // 3. B2C Vendor Subscriptions
    const subResult = await db.collection('vendorsubscriptions').deleteMany({ tierId: { $exists: true } });
    console.log(`✓ Deleted ${subResult.deletedCount} B2C vendor subscriptions`);

    // 4. Hero Banners
    const bannerResult = await db.collection('bannerbookings').deleteMany({ bannerType: 'hero' });
    console.log(`✓ Deleted ${bannerResult.deletedCount} hero banner bookings`);

    // 5. B2C Vendors
    const vendorResult = await db.collection('vendors').deleteMany({ vendorType: 'b2c' });
    console.log(`✓ Deleted ${vendorResult.deletedCount} B2C vendors`);

    console.log('\n=== Cleanup Complete ===');
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Fatal error during cleanup:', err);
    process.exit(1);
});

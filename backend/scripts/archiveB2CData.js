import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ARCHIVE_DIR = './archive/b2c-removal';

async function archiveCollection(db, collectionName, filename, query = {}) {
    console.log(`Archiving ${collectionName}...`);
    const data = await db.collection(collectionName).find(query).toArray();
    const filepath = path.join(ARCHIVE_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`✓ Archived ${data.length} records to ${filepath}`);
    return data.length;
}

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    const db = mongoose.connection.db;

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const stats = {
        timestamp,
        collections: {}
    };

    // Create archive directory
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });

    // 1. Archive pure B2C collections
    const pureB2CCollections = [
        { name: 'users', file: 'users.json', query: { role: 'user' } },
        { name: 'carts', file: 'carts.json' },
        { name: 'orders', file: 'orders.json' },
        { name: 'wishlists', file: 'wishlists.json' },
        { name: 'wallets', file: 'wallets.json' },
        { name: 'wallettransactions', file: 'wallet_transactions.json' },
        { name: 'addresses', file: 'addresses.json' },
        { name: 'b2csubscriptions', file: 'b2c_subscriptions.json' },
        { name: 'subscriptiontiers', file: 'subscription_tiers.json' },
        { name: 'promotionalreels', file: 'promotional_reels.json' },
        { name: 'reelcomments', file: 'reel_comments.json' },
        { name: 'reellikes', file: 'reel_likes.json' },
        { name: 'megarewardentries', file: 'mega_reward_entries.json' },
        { name: 'megarewardsharelinks', file: 'mega_reward_share_links.json' },
        { name: 'megarewardclicklogs', file: 'mega_reward_click_logs.json' },
    ];

    for (const coll of pureB2CCollections) {
        try {
            stats.collections[coll.name] = await archiveCollection(db, coll.name, coll.file, coll.query || {});
        } catch (err) {
            console.warn(`⊘ Skipping ${coll.name}: ${err.message}`);
        }
    }

    // 2. Archive mixed data
    console.log('Archiving mixed data...');

    // B2C Vendors
    stats.collections.b2cVendors = await archiveCollection(db, 'vendors', 'b2c_vendors.json', { vendorType: 'b2c' });

    // B2C Products
    const b2cVendors = await db.collection('vendors').find({ vendorType: 'b2c' }).project({ _id: 1 }).toArray();
    const b2cVendorIds = b2cVendors.map(v => v._id);
    stats.collections.b2cProducts = await archiveCollection(db, 'products', 'b2c_products.json', { vendorId: { $in: b2cVendorIds } });

    // B2C Vendor Subscriptions
    stats.collections.b2cVendorSubscriptions = await archiveCollection(db, 'vendorsubscriptions', 'b2c_vendor_subscriptions.json', { tierId: { $exists: true } });

    // Hero Banners
    stats.collections.heroBanners = await archiveCollection(db, 'bannerbookings', 'hero_banners.json', { bannerType: 'hero' });

    // User Reels
    stats.collections.userReels = await archiveCollection(db, 'reels', 'user_reels.json', { userId: { $exists: true } });

    // Save stats
    await fs.writeFile(path.join(ARCHIVE_DIR, `_stats_${timestamp}.json`), JSON.stringify(stats, null, 2));
    console.log('\n=== Archival Complete ===');
    console.log(`Stats saved to ${ARCHIVE_DIR}/_stats_${timestamp}.json`);

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Fatal error during archival:', err);
    process.exit(1);
});

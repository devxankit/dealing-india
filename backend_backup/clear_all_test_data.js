import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function clearAllTestData() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!\n');

        const db = mongoose.connection.db;

        // ALL collections to clear for complete testing reset
        const collections = [
            // Orders
            { name: 'orders', label: 'Orders' },
            { name: 'returnrequests', label: 'Return Requests' },
            { name: 'refundtransactions', label: 'Refund Transactions' },

            // Carts
            { name: 'carts', label: 'Carts' },

            // User Wallets
            { name: 'wallets', label: 'User Wallets' },
            { name: 'wallettransactions', label: 'User Wallet Transactions' },

            // Vendor Wallets & Earnings
            { name: 'vendorwallets', label: 'Vendor Wallets' },
            { name: 'vendorwallettransactions', label: 'Vendor Wallet Transactions' },

            // Transactions & Settlements
            { name: 'transactions', label: 'Transactions' },
            { name: 'settlements', label: 'Settlements' },

            // Withdrawal Requests
            { name: 'withdrawalrequests', label: 'Withdrawal Requests' },
        ];

        console.log('🗑️  Clearing ALL test data...\n');

        let totalDeleted = 0;

        for (const col of collections) {
            try {
                const collection = db.collection(col.name);
                const countBefore = await collection.countDocuments();

                if (countBefore > 0) {
                    const result = await collection.deleteMany({});
                    console.log(`   ✅ ${col.label.padEnd(30)} : Deleted ${result.deletedCount} documents`);
                    totalDeleted += result.deletedCount;
                } else {
                    console.log(`   ⏭️  ${col.label.padEnd(30)} : Already empty`);
                }
            } catch (err) {
                console.log(`   ⚠️  ${col.label.padEnd(30)} : Collection may not exist`);
            }
        }

        // Also reset vendor wallet balances if the collection wasn't fully deleted
        try {
            const vendorWalletCollection = db.collection('vendorwallets');
            await vendorWalletCollection.updateMany({}, {
                $set: {
                    balance: 0,
                    pendingBalance: 0,
                    totalWithdrawn: 0,
                    lastWithdrawalDate: null
                }
            });
            console.log('\n   🔄 Reset all vendor wallet balances to 0');
        } catch (err) {
            // Ignore if collection doesn't exist
        }

        // Reset user wallet balances
        try {
            const walletCollection = db.collection('wallets');
            await walletCollection.updateMany({}, { $set: { balance: 0 } });
            console.log('   🔄 Reset all user wallet balances to 0');
        } catch (err) {
            // Ignore if collection doesn't exist
        }

        console.log('\n' + '='.repeat(60));
        console.log(`🎉 Total documents deleted: ${totalDeleted}`);
        console.log('📝 All wallets, orders, and earnings cleared!');
        console.log('✨ You can now test the complete order flow from scratch.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

clearAllTestData();

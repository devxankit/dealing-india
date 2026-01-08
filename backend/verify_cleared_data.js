import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyClearing() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!\n');

        const db = mongoose.connection.db;

        // Collections to verify
        const collections = [
            { name: 'orders', label: 'Orders' },
            { name: 'returnrequests', label: 'Return Requests' },
            { name: 'refundtransactions', label: 'Refund Transactions' },
            { name: 'carts', label: 'Carts' },
            { name: 'wallets', label: 'User Wallets' },
            { name: 'wallettransactions', label: 'User Wallet Transactions' },
            { name: 'vendorwallets', label: 'Vendor Wallets' },
            { name: 'vendorwallettransactions', label: 'Vendor Wallet Transactions' },
            { name: 'transactions', label: 'Transactions' },
            { name: 'settlements', label: 'Settlements' },
            { name: 'withdrawalrequests', label: 'Withdrawal Requests' },
        ];

        console.log('📊 Current Database Status:\n');
        console.log('='.repeat(60));

        for (const col of collections) {
            try {
                const collection = db.collection(col.name);
                const count = await collection.countDocuments();
                const status = count === 0 ? '✅ CLEARED' : `⚠️  ${count} documents`;
                console.log(`   ${col.label.padEnd(30)} : ${status}`);
            } catch (err) {
                console.log(`   ${col.label.padEnd(30)} : ⏭️  N/A`);
            }
        }

        // Check vendor wallet balances
        console.log('\n' + '='.repeat(60));
        console.log('\n💰 Vendor Wallet Balances:\n');

        try {
            const vendorWallets = await db.collection('vendorwallets').find({}).toArray();
            if (vendorWallets.length === 0) {
                console.log('   No vendor wallets found (all cleared)');
            } else {
                for (const wallet of vendorWallets) {
                    const status = wallet.balance === 0 && wallet.pendingBalance === 0 ? '✅' : '⚠️';
                    console.log(`   ${status} Vendor ID: ${wallet.vendorId}`);
                    console.log(`      Balance: ₹${wallet.balance}, Pending: ₹${wallet.pendingBalance}`);
                }
            }
        } catch (err) {
            console.log('   Vendor wallets collection not found');
        }

        // Check user wallet balances
        console.log('\n💵 User Wallet Balances:\n');

        try {
            const userWallets = await db.collection('wallets').find({}).toArray();
            if (userWallets.length === 0) {
                console.log('   No user wallets found (all cleared)');
            } else {
                for (const wallet of userWallets) {
                    const status = wallet.balance === 0 ? '✅' : '⚠️';
                    console.log(`   ${status} User ID: ${wallet.userId} - Balance: ₹${wallet.balance}`);
                }
            }
        } catch (err) {
            console.log('   User wallets collection not found');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Verification complete!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

verifyClearing();

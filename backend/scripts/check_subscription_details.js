import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';
import SubscriptionTier from '../models/SubscriptionTier.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia';

async function checkSubscriptionDetails() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the specific subscription
    const subscriptionId = '695b805a24af5eff3d8cea1a';
    const subscription = await VendorSubscription.findById(subscriptionId)
      .populate('vendorId', 'name email storeName vendorType')
      .populate('planId', 'name duration price')
      .populate('tierId', 'name')
      .lean();

    if (subscription) {
      console.log('📋 Subscription Details:\n');
      console.log(JSON.stringify(subscription, null, 2));
      
      console.log('\n\n🔍 Key Fields:');
      console.log(`planId: ${subscription.planId ? subscription.planId._id : 'NULL/UNDEFINED'}`);
      console.log(`tierId: ${subscription.tierId ? subscription.tierId._id : 'NULL/UNDEFINED'}`);
      console.log(`razorpayPaymentId: ${subscription.razorpayPaymentId || 'MISSING'}`);
      console.log(`razorpayOrderId: ${subscription.razorpayOrderId || 'MISSING'}`);
      console.log(`razorpaySignature: ${subscription.razorpaySignature ? 'Present' : 'MISSING'}`);
    } else {
      console.log('❌ Subscription not found');
    }

    // Check all subscriptions
    console.log('\n\n📊 All Subscriptions:\n');
    const allSubs = await VendorSubscription.find({})
      .populate('vendorId', 'name email vendorType')
      .populate('planId', 'name')
      .populate('tierId', 'name')
      .lean();

    allSubs.forEach((sub, index) => {
      console.log(`\n${index + 1}. Subscription ID: ${sub._id}`);
      console.log(`   Vendor: ${sub.vendorId?.name || 'N/A'} (${sub.vendorId?.email || 'N/A'}) - Type: ${sub.vendorId?.vendorType || 'N/A'}`);
      console.log(`   planId: ${sub.planId ? sub.planId._id + ' - ' + sub.planId.name : '❌ NULL'}`);
      console.log(`   tierId: ${sub.tierId ? sub.tierId._id + ' - ' + sub.tierId.name : 'NULL'}`);
      console.log(`   Payment ID: ${sub.razorpayPaymentId || '❌ MISSING'}`);
      console.log(`   Order ID: ${sub.razorpayOrderId || '❌ MISSING'}`);
      console.log(`   Status: ${sub.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkSubscriptionDetails();

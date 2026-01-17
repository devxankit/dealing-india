import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia';

async function checkB2BPaymentData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all B2B vendor subscriptions
    const subscriptions = await VendorSubscription.find({
      planId: { $exists: true, $ne: null }
    })
      .populate('vendorId', 'name email storeName vendorType')
      .populate('planId', 'name duration price')
      .lean();

    console.log(`📊 Total B2B Subscriptions Found: ${subscriptions.length}\n`);

    if (subscriptions.length === 0) {
      console.log('⚠️  No B2B subscriptions found in database.');
      console.log('   This could mean:');
      console.log('   1. No B2B vendors have registered yet');
      console.log('   2. Subscriptions are not being created');
      console.log('   3. planId field is not being set properly\n');
    } else {
      console.log('📋 B2B Subscription Details:\n');
      subscriptions.forEach((sub, index) => {
        console.log(`--- Subscription ${index + 1} ---`);
        console.log(`ID: ${sub._id}`);
        console.log(`Vendor: ${sub.vendorId?.name || 'N/A'} (${sub.vendorId?.email || 'N/A'})`);
        console.log(`Plan: ${sub.planId?.name || 'N/A'} - ${sub.planId?.duration || 'N/A'} months - ₹${sub.planId?.price || 'N/A'}`);
        console.log(`Status: ${sub.status}`);
        console.log(`Payment Method: ${sub.paymentMethod || 'N/A'}`);
        console.log(`Razorpay Order ID: ${sub.razorpayOrderId || '❌ MISSING'}`);
        console.log(`Razorpay Payment ID: ${sub.razorpayPaymentId || '❌ MISSING'}`);
        console.log(`Razorpay Signature: ${sub.razorpaySignature ? '✅ Present' : '❌ MISSING'}`);
        console.log(`Start Date: ${sub.startDate ? new Date(sub.startDate).toLocaleString() : 'N/A'}`);
        console.log(`End Date: ${sub.endDate ? new Date(sub.endDate).toLocaleString() : 'N/A'}`);
        console.log(`Created At: ${sub.createdAt ? new Date(sub.createdAt).toLocaleString() : 'N/A'}`);
        console.log('');
      });

      // Count subscriptions with payment data
      const withPayment = subscriptions.filter(sub => 
        sub.razorpayPaymentId && sub.razorpayOrderId
      );
      const withoutPayment = subscriptions.filter(sub => 
        !sub.razorpayPaymentId || !sub.razorpayOrderId
      );

      console.log('\n📈 Payment Data Statistics:');
      console.log(`✅ Subscriptions with payment data: ${withPayment.length}`);
      console.log(`❌ Subscriptions without payment data: ${withoutPayment.length}`);

      if (withoutPayment.length > 0) {
        console.log('\n⚠️  Subscriptions missing payment data:');
        withoutPayment.forEach(sub => {
          console.log(`   - ${sub._id} (Vendor: ${sub.vendorId?.email || 'N/A'})`);
        });
      }
    }

    // Check recent B2B vendors
    console.log('\n\n🔍 Recent B2B Vendors (Last 10):');
    const recentVendors = await Vendor.find({ vendorType: 'b2b' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('currentSubscription')
      .lean();

    recentVendors.forEach((vendor, index) => {
      console.log(`\n${index + 1}. ${vendor.name} (${vendor.email})`);
      console.log(`   Status: ${vendor.status}`);
      console.log(`   Created: ${vendor.createdAt ? new Date(vendor.createdAt).toLocaleString() : 'N/A'}`);
      console.log(`   Has Subscription: ${vendor.currentSubscription ? '✅ Yes' : '❌ No'}`);
      if (vendor.currentSubscription) {
        const sub = vendor.currentSubscription;
        console.log(`   Subscription ID: ${sub._id}`);
        console.log(`   Payment ID: ${sub.razorpayPaymentId || '❌ MISSING'}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkB2BPaymentData();

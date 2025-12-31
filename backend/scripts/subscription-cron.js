import mongoose from 'mongoose';
import VendorSubscription from '../models/VendorSubscription.model.js';
import SubscriptionTier from '../models/SubscriptionTier.model.js';
import Transaction from '../models/Transaction.model.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const processRenewals = async () => {
  await connectDB();
  console.log('Starting subscription renewal process...');

  const now = new Date();
  const expiringSubscriptions = await VendorSubscription.find({
    status: 'active',
    endDate: { $lte: now },
    autoRenew: true
  }).populate('tierId');

  console.log(`Found ${expiringSubscriptions.length} subscriptions to renew.`);

  for (const sub of expiringSubscriptions) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const amount = sub.billingCycle === 'monthly' ? sub.tierId.priceMonthly : sub.tierId.priceYearly;
      
      // Simulate payment processing here
      console.log(`Processing renewal for vendor ${sub.vendorId}, amount: ${amount}`);

      const nextEndDate = new Date(sub.endDate);
      if (sub.billingCycle === 'monthly') {
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
      } else {
        nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
      }

      sub.startDate = sub.endDate;
      sub.endDate = nextEndDate;
      sub.lastPaymentDate = now;
      sub.nextBillingDate = nextEndDate;
      sub.auditLogs.push({
        action: 'renewal',
        details: { amount, status: 'success' }
      });

      await sub.save({ session });

      await Transaction.create([{
        transactionCode: `RENEW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount,
        type: 'payment',
        status: 'completed',
        method: sub.paymentMethod,
        vendorId: sub.vendorId,
        details: { subscriptionId: sub._id, type: 'auto-renewal' }
      }], { session });

      await session.commitTransaction();
      console.log(`Successfully renewed subscription for vendor ${sub.vendorId}`);
    } catch (error) {
      await session.abortTransaction();
      console.error(`Failed to renew subscription for vendor ${sub.vendorId}:`, error.message);
      
      // Handle failure (e.g., notify vendor, deactivate sub)
      sub.status = 'expired';
      await sub.save();
    } finally {
      session.endSession();
    }
  }

  console.log('Renewal process completed.');
  process.exit(0);
};

processRenewals();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionTier from '../models/SubscriptionTier.model.js';

dotenv.config();

const tiers = [
  {
    name: 'Free',
    description: 'Default plan for all vendors. Pay per upload.',
    priceMonthly: 0,
    reelLimit: 0,
    extraReelPrice: 10,
    features: [
      { name: 'Cost per reel upload: ₹10', included: true },
      { name: 'Basic features', included: true },
      { name: 'Automatic activation', included: true }
    ],
    isActive: true,
    billingCycle: 'monthly'
  },
  {
    name: 'Starter',
    description: 'Ideal for small vendors starting with video content.',
    priceMonthly: 99,
    reelLimit: 30,
    extraReelPrice: 10,
    features: [
      { name: '30 reels per month', included: true },
      { name: 'Additional reels at ₹10 each', included: true },
      { name: 'Standard features', included: true }
    ],
    isActive: true,
    billingCycle: 'monthly'
  },
  {
    name: 'Professional',
    description: 'For active vendors with regular video content.',
    priceMonthly: 299,
    reelLimit: 100,
    extraReelPrice: 10,
    features: [
      { name: '100 reels per month', included: true },
      { name: 'Additional reels at ₹10 each', included: true },
      { name: 'Enhanced features', included: true }
    ],
    isActive: true,
    billingCycle: 'monthly'
  },
  {
    name: 'Premium',
    description: 'For power users with unlimited content needs.',
    priceMonthly: 499,
    reelLimit: -1, // Unlimited
    extraReelPrice: 0,
    features: [
      { name: 'Unlimited reel uploads', included: true },
      { name: 'Premium features', included: true },
      { name: 'Priority support', included: true }
    ],
    isActive: true,
    billingCycle: 'monthly'
  }
];

const seedTiers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Remove existing tiers
    await SubscriptionTier.deleteMany({});
    console.log('Cleared existing subscription tiers');

    // Insert new tiers
    await SubscriptionTier.insertMany(tiers);
    console.log('Successfully seeded subscription tiers');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscription tiers:', error);
    process.exit(1);
  }
};

seedTiers();

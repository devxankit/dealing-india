import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI;

const addPremiumPlan = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const plansCollection = db.collection('b2bsubscriptionplans');

        const premiumPlan = {
            name: "Premium plan",
            duration: 12,
            price: 19999,
            features: [
                "Unlimited Product Listings",
                "Top Spot in Category Search",
                "Verified Premium Badge",
                "Monthly Performance Report",
                "Priority Inquiry Display",
                "Advanced Analytics",
                "Featured Store Badge",
                "24/7 Dedicated Support",
                "Bulk Order Management",
                "Personal Account Manager"
            ],
            isActive: true,
            createdBy: new mongoose.Types.ObjectId("694cd4544d8c7e7472cff1ed"), // Using existing admin ID from other plans
            updatedBy: new mongoose.Types.ObjectId("694cd4544d8c7e7472cff1ed"),
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0,
            razorpayPlanId: "plan_Premium12Month" // Placeholder or dummy
        };

        const result = await plansCollection.insertOne(premiumPlan);
        console.log('Premium plan added successfully:', result.insertedId);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

addPremiumPlan();

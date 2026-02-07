import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI;

const checkPlans = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const plansCollection = db.collection('b2bsubscriptionplans');
        const plans = await plansCollection.find({}).toArray();

        console.log('Current Plans:');
        console.log(JSON.stringify(plans, null, 2));

        const indexes = await plansCollection.indexes();
        console.log('Indexes:');
        console.log(JSON.stringify(indexes, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkPlans();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from './models/Settings.model.js';

dotenv.config();

const inspectSettings = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not found");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const settings = await Settings.findOne();
        if (settings && settings.banners) {
            console.log('Banners Settings:', JSON.stringify(settings.banners, null, 2));
            console.log('Pricing Structure Keys:', Object.keys(settings.banners.pricingStructure || {}));
        } else {
            console.log('Settings not found or empty.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
    }
};

inspectSettings();

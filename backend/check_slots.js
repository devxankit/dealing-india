import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BannerSlot from './models/BannerSlot.model.js';

dotenv.config();

const checkSlots = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not found");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const slots = await BannerSlot.find({});
        console.log(`Found ${slots.length} slots.`);
        slots.forEach(slot => {
            console.log(`Slot ${slot.slotNumber}: Price = ${slot.price}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
};

checkSlots();

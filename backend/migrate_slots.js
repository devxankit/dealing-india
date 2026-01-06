import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BannerSlot from './models/BannerSlot.model.js';

dotenv.config();

const migrateSlots = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not found");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const slots = await BannerSlot.find({});
        console.log(`Found ${slots.length} slots. Updating prices to daily (x24)...`);

        for (const slot of slots) {
            const oldPrice = slot.price;
            const newPrice = oldPrice * 24;
            slot.price = newPrice;
            await slot.save();
            console.log(`Slot ${slot.slotNumber}: ${oldPrice} -> ${newPrice}`);
        }

        console.log('Slot migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateSlots();

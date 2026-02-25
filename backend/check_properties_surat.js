import mongoose from 'mongoose';
import Property from './models/Property.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const properties = await Property.find({ 'location.city': /Surat/i }).select('title location vendorId');
        console.log(JSON.stringify(properties, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();

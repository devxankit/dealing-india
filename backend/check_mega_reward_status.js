
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MegaRewardSettings from './models/MegaRewardSettings.model.js';
import MegaRewardShareLink from './models/MegaRewardShareLink.model.js';
import MegaRewardClickLog from './models/MegaRewardClickLog.model.js';

dotenv.config();

async function checkStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const settings = await MegaRewardSettings.find({});
        console.log('MegaRewardSettings count:', settings.length);
        settings.forEach(s => {
            console.log(`- ID: ${s._id}, Active: ${s.isActive}, Start: ${s.startDate}, End: ${s.endDate}`);
            console.log(`  RequiredClicks: ${JSON.stringify(s.requiredClicks)}`);
        });

        const links = await MegaRewardShareLink.find({});
        console.log('MegaRewardShareLinks count:', links.length);

        const logs = await MegaRewardClickLog.find({});
        console.log('MegaRewardClickLogs count:', logs.length);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkStatus();

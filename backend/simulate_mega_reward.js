
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MegaRewardShareService from './services/megaRewardShare.service.js';
import MegaRewardSettings from './models/MegaRewardSettings.model.js';
import PromotionalReel from './models/PromotionalReel.model.js';

dotenv.config();

async function simulateClick() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Get an active campaign
        const settings = await MegaRewardSettings.findOne({ isActive: true });
        if (!settings) {
            console.error('No active campaign');
            process.exit(1);
        }
        console.log('Found campaign:', settings._id);

        // 2. Get a promotional reel
        const reel = await PromotionalReel.findOne({});
        if (!reel) {
            console.error('No promotional reel');
            process.exit(1);
        }
        console.log('Found reel:', reel._id);

        // 3. Generate a lazy link
        const userId = new mongoose.Types.ObjectId();
        const result = await MegaRewardShareService.generateShareLink(userId, reel._id, 'whatsapp');
        console.log('Generated link:', result.linkCode);

        // 4. Simulate trackClick (POST)
        console.log('Tracking click...');
        const trackResult = await MegaRewardShareService.trackClick(
            result.linkCode,
            '127.0.0.1',
            'test_fingerprint',
            'Test Agent'
        );
        console.log('Track result:', trackResult.success);

        // 5. Verify records
        const MegaRewardShareLink = mongoose.model('MegaRewardShareLink');
        const MegaRewardClickLog = mongoose.model('MegaRewardClickLog');

        const linkCount = await MegaRewardShareLink.countDocuments({});
        const logCount = await MegaRewardClickLog.countDocuments({});

        console.log('Active ShareLinks:', linkCount);
        console.log('Active ClickLogs:', logCount);

        process.exit(0);
    } catch (err) {
        console.error('Simulation failed:', err);
        process.exit(1);
    }
}

simulateClick();

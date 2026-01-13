import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Import Models
import User from '../models/User.model.js';
import MegaRewardSettings from '../models/MegaRewardSettings.model.js';
import MegaRewardEntry from '../models/MegaRewardEntry.model.js';
import MegaRewardShareLink from '../models/MegaRewardShareLink.model.js';
import PromotionalReel from '../models/PromotionalReel.model.js';
import Notification from '../models/Notification.model.js';

// Import Services (to reuse ticket logic)
import MegaRewardEntryService from '../services/megaRewardEntry.service.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const PASSWORD = 'user@123';

const MOBILE_NUMBERS = [
    '6268423925',
    '7724817688',
    '8982292201',
    '6261387233',
    '9685974247',
    '6268204871',
    '9981331303',
    '7000010001', // Random 1
    '7000010002', // Random 2
    '7000010003'  // Random 3
];

async function runAutomation() {
    try {
        console.log('🚀 Starting MegaReward Automation Script...');

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Check for Active Campaign
        const activeSettings = await MegaRewardSettings.findOne({ isActive: true });
        if (!activeSettings) {
            console.error('❌ No active MegaReward campaign found. Please create one in admin panel first.');
            process.exit(1);
        }
        console.log(`📡 Found Active Campaign: ${activeSettings.prizeTitle} (ID: ${activeSettings._id})`);

        // 2. Get a Promotional Reel for this campaign
        const reel = await PromotionalReel.findOne({ megaRewardId: activeSettings._id, isActive: true });
        if (!reel) {
            console.error('❌ No active Promotional Reel found for this campaign. Please add one first.');
            process.exit(1);
        }
        console.log(`🎬 Found Reel: ${reel.title} (ID: ${reel._id})`);

        const report = [];
        const hashedPassword = await bcrypt.hash(PASSWORD, 10);

        // Process in batches for concurrency handling (simulating concurrent registrations)
        console.log(`👥 Processing ${MOBILE_NUMBERS.length} registrations...`);

        // Concurrency: Use Promise.all with chunks or just map all
        const results = await Promise.all(MOBILE_NUMBERS.map(async (phone) => {
            const startTime = Date.now();
            const logPrefix = `[${phone}]`;

            try {
                // Step A: Registration
                let user = await User.findOne({ phone });
                let isNewUser = false;

                if (!user) {
                    console.log(`${logPrefix} Registering new user...`);
                    const email = `user_${phone}_${crypto.randomBytes(2).toString('hex')}@example.com`;
                    user = await User.create({
                        name: `Test User ${phone}`,
                        email,
                        phone,
                        password: hashedPassword,
                        isEmailVerified: true,
                        isActive: true,
                        role: 'user'
                    });
                    isNewUser = true;
                } else {
                    console.log(`${logPrefix} User already exists.`);
                    // Ensure they are active for testing
                    user.isActive = true;
                    user.isEmailVerified = true;
                    await user.save();
                }

                const userId = user._id;

                // Step B: Ensure Participation Eligibility (Force Create Share Links)
                const platforms = ['whatsapp', 'instagram', 'facebook'];
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days

                for (const platform of platforms) {
                    let shareLink = await MegaRewardShareLink.findOne({
                        userId,
                        reelId: reel._id,
                        platform,
                        megaRewardId: activeSettings._id
                    });

                    if (!shareLink) {
                        const linkCode = crypto.randomBytes(4).toString('hex').toUpperCase();
                        shareLink = await MegaRewardShareLink.create({
                            userId,
                            reelId: reel._id,
                            megaRewardId: activeSettings._id,
                            platform,
                            linkCode,
                            uniqueClickCount: activeSettings.requiredClicks[platform] || 1,
                            isEligible: true,
                            expiresAt
                        });
                    } else {
                        shareLink.uniqueClickCount = activeSettings.requiredClicks[platform] || 1;
                        shareLink.isEligible = true;
                        shareLink.expiresAt = expiresAt;
                        await shareLink.save();
                    }
                }

                // Step C: Generate Ticket
                const ticketResult = await MegaRewardEntryService.generateTicket(userId, reel._id);

                const duration = Date.now() - startTime;
                return {
                    phone,
                    status: 'SUCCESS',
                    isNewUser,
                    email: user.email,
                    ticketId: ticketResult.entry.ticketId,
                    duration: `${duration}ms`
                };

            } catch (err) {
                console.error(`${logPrefix} FAILED:`, err.message);
                return {
                    phone,
                    status: 'FAILED',
                    error: err.message
                };
            }
        }));

        // 3. Generate Report
        console.log('\n' + '='.repeat(60));
        console.log('📊 MEGA REWARD AUTOMATION REPORT');
        console.log('='.repeat(60));
        console.log(`${'PHONE'.padEnd(15)} | ${'STATUS'.padEnd(10)} | ${'USER'.padEnd(8)} | ${'TICKET ID'.padEnd(15)} | ${'TIME'}`);
        console.log('-'.repeat(60));

        results.forEach(res => {
            if (res.status === 'SUCCESS') {
                console.log(`${res.phone.padEnd(15)} | ${'SUCCESS'.padEnd(10)} | ${res.isNewUser ? 'NEW'.padEnd(8) : 'EXISTING'.padEnd(8)} | ${res.ticketId.padEnd(15)} | ${res.duration}`);
            } else {
                console.log(`${res.phone.padEnd(15)} | ${'FAILED'.padEnd(10)} | ${'N/A'.padEnd(8)} | ${'N/A'.padEnd(15)} | ERR: ${res.error}`);
            }
        });
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('💥 Critical Script Failure:', error);
        process.exit(1);
    }
}

runAutomation();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MegaRewardShareLink from './models/MegaRewardShareLink.model.js';
import MegaRewardClickLog from './models/MegaRewardClickLog.model.js';
import MegaRewardSettings from './models/MegaRewardSettings.model.js';
import PromotionalReel from './models/PromotionalReel.model.js';
import User from './models/User.model.js';

dotenv.config();

async function testProductionFlow() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Check active campaign
        const campaign = await MegaRewardSettings.findOne({ isActive: true });
        if (!campaign) {
            console.error('❌ No active campaign found');
            process.exit(1);
        }
        console.log('✅ Active campaign:', campaign._id);
        console.log('   Required clicks:', campaign.requiredClicks);

        // 2. Check promotional reels
        const reels = await PromotionalReel.find({});
        console.log(`✅ Found ${reels.length} promotional reels`);
        if (reels.length === 0) {
            console.error('❌ No promotional reels found');
            process.exit(1);
        }

        // 3. Get a test user (or create one)
        let testUser = await User.findOne({ email: 'test@example.com' });
        if (!testUser) {
            console.log('⚠️  No test user found, using first user in DB');
            testUser = await User.findOne({});
        }

        if (!testUser) {
            console.error('❌ No users found in database');
            process.exit(1);
        }
        console.log('✅ Test user:', testUser._id);

        // 4. Test share link generation
        const testReel = reels[0];
        const testPlatform = 'whatsapp';

        console.log('\n📝 Testing share link generation...');
        console.log('   User ID:', testUser._id);
        console.log('   Reel ID:', testReel._id);
        console.log('   Platform:', testPlatform);

        // Check if link already exists
        let existingLink = await MegaRewardShareLink.findOne({
            userId: testUser._id,
            reelId: testReel._id,
            platform: testPlatform
        });

        if (existingLink) {
            console.log('✅ Existing share link found:', existingLink.linkCode);
            console.log('   Click count:', existingLink.uniqueClickCount);
            console.log('   Is eligible:', existingLink.isEligible);
        } else {
            console.log('⚠️  No existing link found, creating new one...');

            // Create new share link
            const newLink = await MegaRewardShareLink.create({
                userId: testUser._id,
                reelId: testReel._id,
                megaRewardId: campaign._id,
                platform: testPlatform,
                expiresAt: campaign.endDate
            });

            console.log('✅ New share link created:', newLink.linkCode);
            existingLink = newLink;
        }

        // 5. Test click logging
        console.log('\n📝 Testing click logging...');
        const testIP = '192.168.1.' + Math.floor(Math.random() * 255);
        const testFingerprint = 'test_fp_' + Date.now();

        try {
            const clickLog = await MegaRewardClickLog.create({
                shareLinkId: existingLink._id,
                ipAddress: testIP,
                fingerprint: testFingerprint,
                userAgent: 'Test User Agent',
                platform: testPlatform
            });

            console.log('✅ Click log created:', clickLog._id);

            // Update share link count
            existingLink.uniqueClickCount += 1;

            const requiredClicks = campaign.requiredClicks[testPlatform];
            if (existingLink.uniqueClickCount >= requiredClicks) {
                existingLink.isEligible = true;
            }

            await existingLink.save();
            console.log('✅ Share link updated');
            console.log('   New click count:', existingLink.uniqueClickCount);
            console.log('   Is eligible:', existingLink.isEligible);

        } catch (error) {
            if (error.code === 11000) {
                console.log('⚠️  Duplicate click (expected if running multiple times)');
            } else {
                throw error;
            }
        }

        // 6. Final verification
        console.log('\n📊 Final Database State:');
        const totalLinks = await MegaRewardShareLink.countDocuments({});
        const totalClicks = await MegaRewardClickLog.countDocuments({});
        console.log('   Total share links:', totalLinks);
        console.log('   Total click logs:', totalClicks);

        // 7. Check indexes
        console.log('\n🔍 Checking indexes...');
        const linkIndexes = await MegaRewardShareLink.collection.getIndexes();
        const clickIndexes = await MegaRewardClickLog.collection.getIndexes();
        console.log('   MegaRewardShareLink indexes:', Object.keys(linkIndexes).length);
        console.log('   MegaRewardClickLog indexes:', Object.keys(clickIndexes).length);

        console.log('\n✅ All tests passed!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testProductionFlow();

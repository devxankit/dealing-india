import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Wallet from '../models/Wallet.model.js';
import VendorWallet from '../models/VendorWallet.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';
import TemporaryRegistration from '../models/TemporaryRegistration.model.js';
import ReferralCode from '../models/ReferralCode.model.js';
import ReferralHistory from '../models/ReferralHistory.model.js';
import {
    ensureReferralCodeForOwner,
    processSuccessfulUserReferral,
    transferUserPointsToVendor,
} from '../services/referral.service.js';
import vendorWalletService from '../services/vendorWallet.service.js';
import { hashPassword } from '../utils/bcrypt.util.js';
import { registerVendor } from '../services/vendorAuth.service.js';

const REFERRER_REWARD_POINTS = Number(process.env.REFERRER_REWARD_POINTS || 50);
const NEW_USER_REWARD_POINTS = Number(process.env.NEW_USER_REWARD_POINTS || 25);

const runId = `ref-test-${Date.now()}`;

const randomPhone = () => String(Math.floor(7000000000 + Math.random() * 2999999999));
const randomEmail = (label) => `${label}.${runId}@example.com`;

const assertCondition = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`PASS: ${message}`);
};

const created = {
    userIds: [],
    vendorIds: [],
};

const createUser = async (label) => {
    const user = await User.create({
        name: label,
        email: randomEmail(label.toLowerCase().replace(/\s+/g, '-')),
        phone: randomPhone(),
        password: await hashPassword('Test@1234'),
        isEmailVerified: true,
        isActive: true,
        role: 'user',
        currentMarketplace: 'b2b',
    });
    created.userIds.push(user._id);
    return user;
};

const createVendor = async (label) => {
    const vendor = await Vendor.create({
        name: label,
        email: randomEmail(label.toLowerCase().replace(/\s+/g, '-')),
        phone: randomPhone(),
        password: await hashPassword('Test@1234'),
        storeName: `${label} Store`,
        status: 'approved',
        isEmailVerified: true,
        isActive: true,
        role: 'vendor',
        vendorType: 'b2b',
    });
    created.vendorIds.push(vendor._id);
    return vendor;
};

const cleanup = async () => {
    const userIds = created.userIds;
    const vendorIds = created.vendorIds;

    await VendorWalletTransaction.deleteMany({ vendorId: { $in: vendorIds } });
    await VendorWallet.deleteMany({ vendorId: { $in: vendorIds } });
    await Wallet.deleteMany({ userId: { $in: userIds } });
    await ReferralHistory.deleteMany({
        $or: [
            { referredUserId: { $in: userIds } },
            { referrerId: { $in: userIds } },
            { referrerId: { $in: vendorIds } },
        ],
    });
    await ReferralCode.deleteMany({
        $or: [
            { userId: { $in: userIds }, userModel: 'User' },
            { userId: { $in: vendorIds }, userModel: 'Vendor' },
        ],
    });
    await TemporaryRegistration.deleteMany({ email: { $regex: runId } });
    await Vendor.deleteMany({ _id: { $in: vendorIds } });
    await User.deleteMany({ _id: { $in: userIds } });
};

const run = async () => {
    await connectDB();
    console.log(`Running referral flow test: ${runId}`);

    // 1) User referral should increment count and reward both wallets.
    const userReferrer = await createUser('User Referrer');
    const userRefCode = await ensureReferralCodeForOwner({ userId: userReferrer._id, userModel: 'User' });
    const userReferred = await createUser('User Referred');

    await processSuccessfulUserReferral({
        referredUserId: userReferred._id,
        referralCode: userRefCode.referralCode,
    });

    const userRefCodeUpdated = await ReferralCode.findById(userRefCode._id);
    const userRefWallet = await Wallet.findOne({ userId: userReferrer._id });
    const userNewWallet = await Wallet.findOne({ userId: userReferred._id });

    assertCondition(userRefCodeUpdated.referralCount === 1, 'User referral count increments to 1');
    assertCondition(userRefWallet?.pointsBalance === REFERRER_REWARD_POINTS, 'User referrer wallet credited correctly');
    assertCondition(userNewWallet?.pointsBalance === NEW_USER_REWARD_POINTS, 'New referred user wallet credited correctly');

    // Duplicate referral for same referred user must be blocked.
    let duplicateBlocked = false;
    try {
        await processSuccessfulUserReferral({
            referredUserId: userReferred._id,
            referralCode: userRefCode.referralCode,
        });
    } catch (error) {
        duplicateBlocked = String(error.message).toLowerCase().includes('already');
    }
    assertCondition(duplicateBlocked, 'Duplicate referral for same user is blocked');

    // 2) Vendor referral should increment vendor count and fund vendor wallet.
    const vendorReferrer = await createVendor('Vendor Referrer');
    const vendorRefCode = await ensureReferralCodeForOwner({ userId: vendorReferrer._id, userModel: 'Vendor' });
    const vendorReferredUser = await createUser('Vendor Referred User');

    await processSuccessfulUserReferral({
        referredUserId: vendorReferredUser._id,
        referralCode: vendorRefCode.referralCode,
    });

    const vendorRefCodeUpdated = await ReferralCode.findById(vendorRefCode._id);
    const vendorWallet = await VendorWallet.findOne({ vendorId: vendorReferrer._id });
    assertCondition(vendorRefCodeUpdated.referralCount === 1, 'Vendor referral count increments to 1');
    assertCondition(vendorWallet?.balance === REFERRER_REWARD_POINTS, 'Vendor wallet credited from referral');

    // Vendor can use points (same wallet used by banner booking flow).
    const debitedWallet = await vendorWalletService.debitWallet(
        vendorReferrer._id,
        10,
        'Test banner debit',
        `TEST-BANNER-${Date.now()}`,
        'banner_booking'
    );
    assertCondition(debitedWallet.balance === REFERRER_REWARD_POINTS - 10, 'Vendor wallet points are spendable (banner-style debit)');

    // 3) User can transfer reward points to another vendor.
    const recipientVendor = await createVendor('Recipient Vendor');
    const transferResult = await transferUserPointsToVendor({
        userId: userReferred._id,
        vendorId: recipientVendor._id,
        points: 10,
    });
    const userAfterTransfer = await Wallet.findOne({ userId: userReferred._id });
    const vendorAfterTransfer = await VendorWallet.findOne({ vendorId: recipientVendor._id });
    assertCondition(Boolean(transferResult.referenceId), 'Transfer returns reference ID');
    assertCondition(userAfterTransfer.pointsBalance === NEW_USER_REWARD_POINTS - 10, 'User points debited after transfer');
    assertCondition(vendorAfterTransfer.balance === 10, 'Recipient vendor wallet credited after transfer');

    // 4) User can register as vendor with same email.
    const sameEmailUser = await createUser('Same Email User');
    const vendorRegistrationResult = await registerVendor({
        name: 'Same Email Vendor',
        email: sameEmailUser.email,
        phone: randomPhone(),
        password: 'Test@1234',
        storeName: 'Same Email Store',
        vendorType: 'b2b',
    });
    assertCondition(vendorRegistrationResult?.success !== false, 'User can initiate vendor registration with same email');
    assertCondition(vendorRegistrationResult?.email === sameEmailUser.email.toLowerCase(), 'Same-email vendor registration returns expected email');

    console.log('ALL REFERRAL FLOW CHECKS PASSED');
};

run()
    .catch(async (error) => {
        console.error('FLOW TEST FAILED:', error.message);
        console.error(error.stack);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await cleanup();
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError.message);
        }
        await mongoose.connection.close();
    });

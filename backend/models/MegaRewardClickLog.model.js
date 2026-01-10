import mongoose from 'mongoose';

/**
 * MegaRewardClickLog Schema
 * Fraud-safe unique click tracking using multiple identifiers:
 * - IP Address + Fingerprint (for guests)
 * - viewerUserId (for logged-in users - ensures one count per user per link)
 * 
 * Click Counting Logic:
 * - WhatsApp: 5 unique clicks per link = 1 count
 * - Instagram/Facebook: 1 unique click per link = 1 count
 * - Same user (by IP+fingerprint OR viewerUserId) clicking same link = only counted once
 */
const megaRewardClickLogSchema = new mongoose.Schema({
    shareLinkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MegaRewardShareLink',
        required: true
    },
    // The user who owns the share link (for reference)
    linkOwnerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // The user who clicked the link (if logged in)
    viewerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    // Browser fingerprint hash for additional uniqueness
    fingerprint: {
        type: String,
        default: ''
    },
    platform: {
        type: String,
        enum: ['whatsapp', 'instagram', 'facebook'],
        required: true
    },
    // Has this click been counted towards eligibility?
    counted: {
        type: Boolean,
        default: true
    },
    clickedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index: prevent duplicate clicks from same IP + fingerprint on same link
// This catches guests using same device
megaRewardClickLogSchema.index(
    { shareLinkId: 1, ipAddress: 1, fingerprint: 1 },
    { unique: true }
);

// Index for logged-in user uniqueness check (handled in service layer, not unique here
// because viewerUserId can be null for guests)
megaRewardClickLogSchema.index({ shareLinkId: 1, viewerUserId: 1 });

// Index for querying clicks by link owner
megaRewardClickLogSchema.index({ linkOwnerUserId: 1, platform: 1 });

// Index for time-based queries
megaRewardClickLogSchema.index({ clickedAt: -1 });

const MegaRewardClickLog = mongoose.model('MegaRewardClickLog', megaRewardClickLogSchema);

export default MegaRewardClickLog;

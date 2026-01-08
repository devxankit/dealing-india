import mongoose from 'mongoose';

/**
 * MegaRewardClickLog Schema
 * Fraud-safe unique click tracking using IP + fingerprint
 */
const megaRewardClickLogSchema = new mongoose.Schema({
    shareLinkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MegaRewardShareLink',
        required: true
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
    clickedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index: prevent duplicate clicks from same IP + fingerprint
megaRewardClickLogSchema.index(
    { shareLinkId: 1, ipAddress: 1, fingerprint: 1 },
    { unique: true }
);
megaRewardClickLogSchema.index({ shareLinkId: 1 });
megaRewardClickLogSchema.index({ clickedAt: -1 });

const MegaRewardClickLog = mongoose.model('MegaRewardClickLog', megaRewardClickLogSchema);

export default MegaRewardClickLog;

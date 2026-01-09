import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * MegaRewardShareLink Schema
 * Unique share link per user + reel + platform combination
 */
const megaRewardShareLinkSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromotionalReel',
        required: true
    },
    megaRewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MegaRewardSettings',
        required: true
    },
    platform: {
        type: String,
        enum: ['whatsapp', 'instagram', 'facebook'],
        required: true
    },
    linkCode: {
        type: String,
        unique: true,
        required: true
    },
    // Cached count for performance (incremented by click tracking)
    uniqueClickCount: {
        type: Number,
        default: 0
    },
    // Whether this platform's threshold has been met
    isEligible: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// Generate unique link code before validation
megaRewardShareLinkSchema.pre('validate', function (next) {
    if (!this.linkCode) {
        // Generate a unique short code: random 8 character alphanumeric
        this.linkCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }
    next();
});

// Compound unique index: one link per user + reel + platform
megaRewardShareLinkSchema.index({ userId: 1, reelId: 1, platform: 1 }, { unique: true });
megaRewardShareLinkSchema.index({ megaRewardId: 1 });
megaRewardShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const MegaRewardShareLink = mongoose.model('MegaRewardShareLink', megaRewardShareLinkSchema);

export default MegaRewardShareLink;

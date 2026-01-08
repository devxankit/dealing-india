import mongoose from 'mongoose';

/**
 * MegaRewardEntry Schema
 * Lucky draw ticket - generated ONLY when ALL platform conditions are met
 */
const megaRewardEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    megaRewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MegaRewardSettings',
        required: true
    },
    // Unique ticket ID format: MR-YYYYMM-XXXX
    ticketId: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'winner', 'expired'],
        default: 'active'
    },
    // Track which platforms have met eligibility
    eligibilityMet: {
        whatsapp: {
            type: Boolean,
            default: false
        },
        instagram: {
            type: Boolean,
            default: false
        },
        facebook: {
            type: Boolean,
            default: false
        }
    },
    // Which reel was shared to become eligible
    reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromotionalReel',
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Generate unique ticket ID before validation
megaRewardEntrySchema.pre('validate', function (next) {
    if (!this.ticketId) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 7).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.ticketId = `MR-${dateStr}-${randomStr}`;
    }
    next();
});

// One entry per user per campaign
megaRewardEntrySchema.index({ userId: 1, megaRewardId: 1 }, { unique: true });
megaRewardEntrySchema.index({ ticketId: 1 }, { unique: true });
megaRewardEntrySchema.index({ megaRewardId: 1, status: 1 });
megaRewardEntrySchema.index({ generatedAt: -1 });

const MegaRewardEntry = mongoose.model('MegaRewardEntry', megaRewardEntrySchema);

export default MegaRewardEntry;

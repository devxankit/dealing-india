import mongoose from 'mongoose';

/**
 * MegaRewardWinner Schema
 * Winner records with wallet integration
 */
const megaRewardWinnerSchema = new mongoose.Schema({
    entryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MegaRewardEntry',
        required: true,
        unique: true // One entry can only win once
    },
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
    prizeRank: {
        type: String,
        required: true,
        trim: true  // "1st Prize", "2nd Prize", "3rd Prize", "Consolation" etc.
    },
    prizeAmount: {
        type: Number,
        required: true,
        min: 0
    },
    prizeDescription: {
        type: String,
        trim: true
    },
    // Reference to wallet transaction for audit trail
    walletTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WalletTransaction'
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    declaredAt: {
        type: Date,
        default: Date.now
    },
    declaredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Indexes
megaRewardWinnerSchema.index({ megaRewardId: 1, prizeRank: 1 });
megaRewardWinnerSchema.index({ declaredAt: -1 });

// Compound index to prevent same user winning multiple times in same campaign
megaRewardWinnerSchema.index({ userId: 1, megaRewardId: 1 }, { unique: true });

const MegaRewardWinner = mongoose.model('MegaRewardWinner', megaRewardWinnerSchema);

export default MegaRewardWinner;

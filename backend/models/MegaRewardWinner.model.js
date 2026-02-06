import mongoose from 'mongoose';

const megaRewardWinnerSchema = new mongoose.Schema({
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MegaRewardEntry', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    megaRewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'MegaRewardSettings', required: true },
    prizeRank: { type: String, required: true },
    prizeAmount: { type: Number, required: true },
    prizeDescription: String,
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
    declaredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    declaredAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('MegaRewardWinner', megaRewardWinnerSchema);

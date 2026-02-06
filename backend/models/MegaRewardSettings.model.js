import mongoose from 'mongoose';

const megaRewardSettingsSchema = new mongoose.Schema({
    prizeTitle: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    prizes: [{
        rank: { type: String, required: true },
        amount: { type: Number, required: true },
        winnerCount: { type: Number, default: 1 },
        description: String
    }],
    customRanges: [{
        startRank: Number,
        endRank: Number,
        prizeAmount: Number,
        description: String
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

export default mongoose.model('MegaRewardSettings', megaRewardSettingsSchema);

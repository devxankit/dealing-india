import mongoose from 'mongoose';

const megaRewardEntrySchema = new mongoose.Schema({
    megaRewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'MegaRewardSettings', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'winner', 'claimed', 'expired'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('MegaRewardEntry', megaRewardEntrySchema);

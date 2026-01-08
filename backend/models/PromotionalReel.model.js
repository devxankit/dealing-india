import mongoose from 'mongoose';

const promotionalReelSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    videoUrl: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        default: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },

    // Engagement Stats
    shares: {
        type: Number,
        default: 0,
        min: 0
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    comments: {
        type: Number,
        default: 0,
        min: 0
    },

    // Follow System: Users who followed this reel (or the entity it represents)
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Mega Reward Integration
    points: {
        type: Number,
        default: 10 // Default points for watching/engaging
    },
    requiredDuration: {
        type: Number,
        default: 15 // Seconds user must watch
    },

    // Link to active Mega Reward campaign
    megaRewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MegaRewardSettings',
        default: null  // null means not linked to any campaign
    }

}, { timestamps: true });

export default mongoose.model('PromotionalReel', promotionalReelSchema);

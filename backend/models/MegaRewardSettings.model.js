import mongoose from 'mongoose';

/**
 * MegaRewardSettings Schema
 * Stores campaign configuration. Only ONE active campaign at a time.
 */
const megaRewardSettingsSchema = new mongoose.Schema({
    prizeTitle: {
        type: String,
        required: [true, 'Prize title is required'],
        trim: true,
        default: 'Grand Monthly Jackpot'
    },
    prizes: [{
        rank: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        description: {
            type: String,
            trim: true
        },
        icon: {
            type: String,
            default: '🎁'
        },
        winnerCount: {
            type: Number,
            default: 1,
            min: 1
        }
    }],
    customRanges: [{
        startRank: {
            type: Number,
            required: true,
            min: 4
        },
        endRank: {
            type: Number,
            required: true,
            min: 4
        },
        prizeAmount: {
            type: Number,
            required: true,
            min: 0
        },
        description: {
            type: String,
            trim: true
        },
        icon: {
            type: String,
            default: '🎁'
        }
    }],
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    isActive: {
        type: Boolean,
        default: false
    },
    // Required unique clicks per platform for eligibility
    requiredClicks: {
        whatsapp: {
            type: Number,
            default: 5  // 5 unique people must open the link
        },
        instagram: {
            type: Number,
            default: 1  // 1 unique person must open the link
        },
        facebook: {
            type: Number,
            default: 1  // 1 unique person must open the link
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Ensure only one active campaign at a time
megaRewardSettingsSchema.pre('save', async function (next) {
    if (this.isActive && this.isModified('isActive')) {
        // Deactivate all other campaigns
        await this.constructor.updateMany(
            { _id: { $ne: this._id }, isActive: true },
            { isActive: false }
        );
    }
    next();
});

// Validate end date is after start date
megaRewardSettingsSchema.pre('save', function (next) {
    if (this.endDate <= this.startDate) {
        return next(new Error('End date must be after start date'));
    }
    next();
});

// Indexes
megaRewardSettingsSchema.index({ isActive: 1 });
megaRewardSettingsSchema.index({ startDate: 1, endDate: 1 });
megaRewardSettingsSchema.index({ createdAt: -1 });

const MegaRewardSettings = mongoose.model('MegaRewardSettings', megaRewardSettingsSchema);

export default MegaRewardSettings;

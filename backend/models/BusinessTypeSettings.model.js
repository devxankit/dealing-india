import mongoose from 'mongoose';

const businessTypeSettingsSchema = new mongoose.Schema(
    {
        businessTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BusinessType',
            required: true,
            unique: true,
        },
        enabledModules: [
            {
                type: String,
                enum: ['product', 'property', 'subscription', 'banner', 'profile', 'settings', 'leads'],
            },
        ],
        maxImagesPerProperty: {
            type: Number,
            default: 5,
        },
        features: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

const BusinessTypeSettings = mongoose.model('BusinessTypeSettings', businessTypeSettingsSchema);

export default BusinessTypeSettings;

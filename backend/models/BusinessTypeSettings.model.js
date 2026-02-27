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
                enum: [
                    'product',
                    'property',
                    'subscription',
                    'banner',
                    'profile',
                    'settings',
                    'leads',
                    'lotslot',
                    'notifications',
                    'shop-listing',
                ],
            },
        ],
        productFormType: {
            type: String,
            enum: ['standard'],
            default: 'standard'
        },
        enableShopListing: {
            type: Boolean,
            default: true,
        },
        features: {
            type: mongoose.Schema.Types.Mixed,
            default: {
                canReceiveLeads: true,
                hasPremiumBadge: false,
                canAccessAnalytics: true
            },
        },

        dashboardWidgets: [
            {
                type: String,
                enum: ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts', 'quick_actions'],
            },
        ],
        allowedPlans: [
            {
                type: String, // Storing plan slugs or IDs
            }
        ],
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

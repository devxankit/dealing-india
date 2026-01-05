import mongoose from 'mongoose';

const deliveryRuleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Rule name is required'],
            trim: true,
            unique: true,
        },
        description: {
            type: String,
            trim: true,
        },
        chargeType: {
            type: String,
            enum: ['flat', 'flexible'], // flat = fixed price, flexible = weight/distance based
            default: 'flexible',
        },
        baseCharge: {
            type: Number,
            default: 0,
            min: 0,
            description: 'Base charge applied regardless of weight/distance (optional handling fee)'
        },
        // Weight Brackets: Define price for weight ranges
        // e.g., 0-0.5kg: 50, 0.5-2kg: 100
        weightBrackets: [{
            maxWeight: { type: Number, required: true }, // Upper limit in kg
            price: { type: Number, required: true, min: 0 },
        }],
        // Fallback price per kg if weight exceeds all brackets
        pricePerAdditionalKg: {
            type: Number,
            default: 50,
            min: 0,
        },
        // Distance Zones: Multipliers or additions based on location match
        distanceZones: {
            local: {
                basePrice: { type: Number, default: 40, min: 0 }, // Same City
                multiplier: { type: Number, default: 1.0, min: 0 },
            },
            regional: {
                basePrice: { type: Number, default: 60, min: 0 }, // Same State
                multiplier: { type: Number, default: 1.2, min: 0 },
            },
            national: {
                basePrice: { type: Number, default: 100, min: 0 }, // Different State
                multiplier: { type: Number, default: 1.5, min: 0 },
            }
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

const DeliveryRule = mongoose.model('DeliveryRule', deliveryRuleSchema);

export default DeliveryRule;

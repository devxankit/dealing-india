import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DeliveryRule from './models/DeliveryRule.model.js';
import connectDB from './config/database.js';

dotenv.config();

const seedDefaultDeliveryRule = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        const exists = await DeliveryRule.findOne({ isDefault: true });
        if (exists) {
            console.log('Default Delivery Rule already exists.');
            process.exit(0);
        }

        const defaultRule = {
            name: "Standard Delivery",
            description: "Default weight and distance based delivery rule",
            chargeType: "flexible",
            baseCharge: 0,
            weightBrackets: [
                { maxWeight: 0.5, price: 40 },
                { maxWeight: 1.0, price: 60 },
                { maxWeight: 2.0, price: 100 },
                { maxWeight: 5.0, price: 200 }
            ],
            pricePerAdditionalKg: 40,
            distanceZones: {
                local: { basePrice: 20, multiplier: 1.0 },     // Same City
                regional: { basePrice: 40, multiplier: 1.2 },  // Same State
                national: { basePrice: 60, multiplier: 1.5 }   // Different State
            },
            isActive: true,
            isDefault: true
        };

        await DeliveryRule.create(defaultRule);
        console.log('Default Delivery Rule Created Successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding rule:', error);
        process.exit(1);
    }
};

seedDefaultDeliveryRule();

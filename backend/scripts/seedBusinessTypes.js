import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BusinessType from '../models/BusinessType.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import connectDB from '../config/database.js';

dotenv.config();

const seedBusinessTypes = async () => {
    try {
        await connectDB();

        // Clear existing
        await BusinessType.deleteMany({});
        await BusinessTypeSettings.deleteMany({});

        const types = [
            { name: 'Textile', slug: 'textile', description: 'Textile and Garments manufacturing and trading' },
            { name: 'Property Broker', slug: 'property-broker', description: 'Real estate brokerage and consulting' },
            { name: 'Property Developer', slug: 'property-developer', description: 'Real estate development and construction' },
        ];

        for (const type of types) {
            const createdType = await BusinessType.create(type);

            let enabledModules = ['subscription', 'profile', 'settings'];
            let maxImages = 5;

            if (type.slug === 'textile') {
                enabledModules.push('product', 'banner');
            } else if (type.slug === 'property-broker') {
                enabledModules.push('property');
                maxImages = 5;
            } else if (type.slug === 'property-developer') {
                enabledModules.push('property');
                maxImages = 50;
            }

            await BusinessTypeSettings.create({
                businessTypeId: createdType._id,
                enabledModules,
                maxImagesPerProperty: maxImages,
            });

            console.log(`✅ Seeded ${type.name}`);
        }

        console.log('🚀 Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding business types:', error);
        process.exit(1);
    }
};

seedBusinessTypes();

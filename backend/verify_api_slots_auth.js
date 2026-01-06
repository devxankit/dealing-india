import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Vendor from './models/Vendor.model.js';

dotenv.config();

const verifyWithAuth = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const vendor = await Vendor.findOne({});
        let token;

        // Match backend/utils/jwt.util.js options
        const signOptions = {
            expiresIn: '1d',
            issuer: 'dealing-india-api',
            audience: 'dealing-india-client'
        };

        if (vendor) {
            console.log('Using vendor:', vendor._id);
            token = jwt.sign({ vendorId: vendor._id, role: 'vendor' }, process.env.JWT_SECRET, signOptions);
        } else {
            console.log('No vendor found, using fake');
            const fakeId = new mongoose.Types.ObjectId();
            token = jwt.sign({ vendorId: fakeId, role: 'vendor' }, process.env.JWT_SECRET, signOptions);
        }

        const url = 'http://localhost:5000/api/vendor/hero-banners/slots';
        console.log(`Fetching from: ${url}`);

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: false
        });

        console.log('Status:', response.status);
        if (response.status === 200) {
            const data = response.data.data;
            console.log('--- SETTINGS (API Returned) ---');
            const s = data.settings;
            console.log('defaultPricePerDay:', s.defaultPricePerDay);
            console.log('minDurationHours:', s.minDurationHours);
            console.log('pricingStructure:', JSON.stringify(s.pricingStructure));

            console.log('--- SLOTS (API Returned) ---');
            if (data.slots && data.slots.length > 0) {
                data.slots.slice(0, 5).forEach(slot => {
                    console.log(`Slot ${slot.slotNumber}: Price=${slot.price}`);
                });
            } else {
                console.log('No slots returned.');
            }
        } else {
            console.log('Error Body:', JSON.stringify(response.data, null, 2));
        }

        process.exit(0);

    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
};

verifyWithAuth();

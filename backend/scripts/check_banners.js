import mongoose from 'mongoose';
import BannerBooking from '../models/BannerBooking.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import dns from 'dns';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Set Google DNS to fix querySrv ECONNREFUSED issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dealingindia');
        console.log('Connected to MongoDB');

        const recentBookings = await BannerBooking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('vendorId', 'email storeName businessName');

        recentBookings.forEach(b => {
            console.log('-------------------');
            console.log('Booking ID:', b._id);
            console.log('Vendor:', b.vendorId?.email);
            console.log('Amount:', b.amount);
            console.log('Status:', b.status);
            console.log('Payment Status:', b.paymentStatus);
            console.log('Payment Method:', b.paymentMethod);
            console.log('Zoho Invoice ID:', b.zohoInvoiceId);
            console.log('Zoho Payment ID:', b.zohoPaymentId);
            console.log('Email Notification:', b.emailNotification);
            console.log('Accounting Errors:', JSON.stringify(b.accountingErrors, null, 2));
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

check();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const seedBookings = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));
        const BannerSlot = mongoose.model('BannerSlot', new mongoose.Schema({}, { strict: false }));
        const BannerBooking = mongoose.model('BannerBooking', new mongoose.Schema({}, { strict: false }));

        const vendor = await Vendor.findOne({});
        if (!vendor) {
            console.log('No vendor found to associate booking with!');
            process.exit(0);
        }

        const heroSlot = await BannerSlot.findOne({ bannerType: 'hero', slotNumber: 1 });
        const b2bSlot = await BannerSlot.findOne({ bannerType: 'b2b', slotNumber: 1 });

        console.log('Cleaning up existing test bookings...');
        await BannerBooking.deleteMany({ referenceId: { $in: ['TEST-HERO-001', 'TEST-B2B-001'] } });

        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const testBookings = [
            {
                vendorId: vendor._id,
                slotId: heroSlot?._id,
                bannerType: 'hero',
                referenceId: 'TEST-HERO-001',
                bannerImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=2000',
                title: 'Hero Test Ad',
                startDate: now,
                endDate: nextWeek,
                status: 'pending',
                paymentStatus: 'paid',
                adminApprovalStatus: 'pending',
                amount: 1999,
                durationHours: 168
            },
            {
                vendorId: vendor._id,
                slotId: b2bSlot?._id,
                bannerType: 'b2b',
                referenceId: 'TEST-B2B-001',
                bannerImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=2000',
                title: 'B2B Test Ad',
                startDate: now,
                endDate: nextWeek,
                status: 'pending',
                paymentStatus: 'paid',
                adminApprovalStatus: 'pending',
                amount: 2999,
                durationHours: 168
            }
        ];

        console.log('Seeding test bookings...');
        await BannerBooking.insertMany(testBookings);
        console.log('Successfully seeded 2 test bookings (1 Hero, 1 B2B)');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding bookings:', error);
        process.exit(1);
    }
};

seedBookings();

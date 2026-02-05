import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const clearBookings = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const BannerBooking = mongoose.model('BannerBooking', new mongoose.Schema({}, { strict: false }));
        const BannerSlot = mongoose.model('BannerSlot', new mongoose.Schema({}, { strict: false }));

        console.log('Cleaning up all banner bookings...');
        const bookingResult = await BannerBooking.deleteMany({});
        console.log(`✅ Deleted ${bookingResult.deletedCount} bookings.`);

        console.log('Resetting all banner slots (clearing currentBooking)...');
        const slotResult = await BannerSlot.updateMany({}, { $set: { currentBooking: null } });
        console.log(`✅ Reset ${slotResult.modifiedCount} slots.`);

        process.exit(0);
    } catch (error) {
        console.error('Error clearing bookings:', error);
        process.exit(1);
    }
};

clearBookings();

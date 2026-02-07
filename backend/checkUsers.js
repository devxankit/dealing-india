
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';
import TemporaryRegistration from './models/TemporaryRegistration.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealing_india';

const checkUsers = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}).select('name email phone role isActive isEmailVerified createdAt');
        console.log('\n--- USERS IN DB ---');
        console.table(users.map(u => ({
            _id: u._id.toString(),
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            active: u.isActive,
            verified: u.isEmailVerified,
            created: u.createdAt
        })));

        const tempRegs = await TemporaryRegistration.find({});
        console.log('\n--- TEMPORARY REGISTRATIONS IN DB ---');
        console.table(tempRegs.map(t => ({
            _id: t._id.toString(),
            email: t.email,
            phone: t.phone,
            otp: t.otp
        })));


    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkUsers();

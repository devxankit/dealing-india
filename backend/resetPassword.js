
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const resetPassword = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'mrindianarmy100@gmail.com'; // Target user
        const newPassword = '12345678';

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const result = await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );

        if (result) {
            console.log(`✅ Password for ${email} has been reset to: ${newPassword}`);
        } else {
            console.log(`❌ User ${email} not found.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

resetPassword();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';
import { hashPassword } from '../utils/bcrypt.util.js';
import dns from 'dns';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const prepareTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const plainPassword = 'password123';
    const hp = await hashPassword(plainPassword);
    
    // Update Vendor
    const vendor = await Vendor.findOneAndUpdate(
      { email: 'sheetalchouhan689@gmail.com' },
      { $set: { password: hp, status: 'approved', isActive: true, isEmailVerified: true } },
      { new: true }
    );
    console.log('Vendor updated:', vendor ? vendor.email : 'NOT FOUND');
    
    // Update Admin
    const admin = await Admin.findOneAndUpdate(
      { email: 'admin@gmail.com' },
      { $set: { password: hp, isActive: true } },
      { new: true }
    );
    console.log('Admin updated:', admin ? admin.email : 'NOT FOUND');
    
    await mongoose.connection.close();
    console.log('Preparation complete. Password set to "password123" for both.');
  } catch (err) {
    console.error('Error during preparation:', err);
    process.exit(1);
  }
};

prepareTestUsers();

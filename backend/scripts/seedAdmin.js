import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.model.js';
import { hashPassword } from '../utils/bcrypt.util.js';
import connectDB from '../config/database.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Default admin credentials
    const adminData = {
      name: 'Admin User',
      email: 'admin@admin.com',
      password: 'admin123',
      role: 'admin',
      isActive: true,
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('✅ Admin already exists:', adminData.email);
      // Update password if needed
      const hashedPassword = await hashPassword(adminData.password);
      existingAdmin.password = hashedPassword;
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Admin password updated');
    } else {
      // Create new admin
      const hashedPassword = await hashPassword(adminData.password);
      const admin = new Admin({
        ...adminData,
        password: hashedPassword,
      });
      
      await admin.save();
      console.log('✅ Admin created successfully:', adminData.email);
    }

    console.log('\n📧 Admin Credentials:');
    console.log('   Email:', adminData.email);
    console.log('   Password:', adminData.password);
    console.log('\n');

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

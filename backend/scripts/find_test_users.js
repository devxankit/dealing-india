import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const vendors = await Vendor.find({ status: 'approved' }).limit(1);
    const admins = await Admin.find({}).limit(1);
    
    console.log('--- Vendor ---');
    console.log(vendors[0] ? { email: vendors[0].email, id: vendors[0]._id } : 'No approved vendors');
    
    console.log('--- Admin ---');
    console.log(admins[0] ? { email: admins[0].email, id: admins[0]._id } : 'No admins');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

checkData();

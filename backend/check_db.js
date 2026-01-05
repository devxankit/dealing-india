import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealing-india';

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

    const orderCount = await Order.countDocuments();
    const vendorCount = await Vendor.countDocuments();
    const productCount = await Product.countDocuments();

    console.log(`Total Orders: ${orderCount}`);
    console.log(`Total Vendors: ${vendorCount}`);
    console.log(`Total Products: ${productCount}`);

    if (orderCount > 0) {
      const sampleOrder = await Order.findOne().lean();
      console.log('Sample Order Keys:', Object.keys(sampleOrder));
      if (sampleOrder.items) {
        console.log('Sample Order Items Count:', sampleOrder.items.length);
        console.log('Sample Order First Item ProductId:', sampleOrder.items[0].productId);
      }
      if (sampleOrder.vendorBreakdown) {
        console.log('Sample Order VendorBreakdown Count:', sampleOrder.vendorBreakdown.length);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();

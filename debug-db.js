import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './backend/models/Order.model.js';
import Product from './backend/models/Product.model.js';
import User from './backend/models/User.model.js';

dotenv.config();

const debug = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const orderCount = await Order.countDocuments();
    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments({ role: 'user' });

    console.log('Order Count:', orderCount);
    console.log('Product Count:', productCount);
    console.log('User Count (role: user):', userCount);

    if (orderCount > 0) {
      const latestOrder = await Order.findOne().sort({ orderDate: -1 });
      console.log('Latest Order Date:', latestOrder.orderDate);
    }

    if (productCount > 0) {
      const latestProduct = await Product.findOne().sort({ createdAt: -1 });
      console.log('Latest Product CreatedAt:', latestProduct.createdAt);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

debug();

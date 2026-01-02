import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BannerSlot from '../models/BannerSlot.model.js';
import connectDB from '../config/database.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const bannerSlots = [
  { slotNumber: 1, price: 1999 },
  { slotNumber: 2, price: 1499 },
  { slotNumber: 3, price: 999 },
  { slotNumber: 4, price: 799 },
  { slotNumber: 5, price: 599 },
  { slotNumber: 6, price: 499 },
  { slotNumber: 7, price: 399 },
  { slotNumber: 8, price: 299 },
  { slotNumber: 9, price: 199 },
  { slotNumber: 10, price: 99 },
];

const seedBannerSlots = async () => {
  try {
    await connectDB();

    // Clear existing slots
    await BannerSlot.deleteMany({});

    // Create new slots
    await BannerSlot.insertMany(bannerSlots);

    console.log('Banner slots seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding banner slots:', error);
    process.exit(1);
  }
};

seedBannerSlots();

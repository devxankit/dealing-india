import mongoose from 'mongoose';
import Reel from '../backend/models/Reel.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function checkReel() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const reelId = '69c38bf4e5f35135b8c6b503';
    const reel = await Reel.findById(reelId);
    if (!reel) {
      console.log('Reel not found');
    } else {
      console.log('Reel Data:', JSON.stringify(reel, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkReel();

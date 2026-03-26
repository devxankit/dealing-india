import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkFollows() {
  await mongoose.connect(MONGODB_URI);
  
  const VendorFollow = mongoose.connection.db.collection('vendorfollows');
  const allFollows = await VendorFollow.find({}).toArray();
  
  console.log(`Total Follow Records: ${allFollows.length}`);
  if (allFollows.length > 0) {
    console.log('Sample Records:');
    allFollows.forEach((f, i) => {
      console.log(`${i+1}. Follower(userId): ${f.userId}, Following(vendorId): ${f.vendorId}`);
    });
  } else {
    console.log('No follow records found in "vendorfollows" collection.');
    
    // Check if collection name is different
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nExisting collections:');
    collections.forEach(c => console.log(' - ' + c.name));
  }

  await mongoose.disconnect();
}

checkFollows().catch(console.error);

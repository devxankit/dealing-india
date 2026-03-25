
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VendorAddon from './models/VendorAddon.model.js';
import vendorAddonService from './services/vendorAddon.service.js';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const addons = await VendorAddon.find({ zohoInvoiceId: { $exists: false } });
    console.log(`Found ${addons.length} addons without invoices.`);

    for (const addon of addons) {
      console.log(`Processing addon: ${addon._id} for Vendor: ${addon.vendorId}`);
      try {
        await vendorAddonService.processZohoAndEmailForAddon(addon._id);
        console.log(`Successfully processed addon: ${addon._id}`);
      } catch (e) {
        console.error(`Failed to process addon: ${addon._id}`, e.message);
      }
    }

    console.log('Done.');
  } catch (error) {
    console.error('Run failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();

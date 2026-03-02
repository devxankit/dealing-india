import mongoose from 'mongoose';

const vendorContactClickSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    clickType: {
      type: String,
      enum: ['call', 'whatsapp', 'map'],
      required: true,
      index: true,
    },
    // Only set when the click is made by a logged-in user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // YYYY-MM-DD in Asia/Kolkata timezone
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    // Optional context (not required for dedupe rule)
    itemType: {
      type: String,
      enum: ['product', 'lotslot', 'property', 'vendor', 'unknown'],
      default: 'unknown',
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

vendorContactClickSchema.index(
  { vendorId: 1, clickType: 1, dateKey: 1, userId: 1 },
  { name: 'vendor_clicktype_date_user' }
);

export default mongoose.model('VendorContactClick', vendorContactClickSchema);


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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['user', 'vendor', 'admin', 'superadmin', null],
      default: null,
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
      enum: ['product', 'lotslot', 'property', 'vendor', 'reel', 'unknown'],
      default: 'unknown',
    },
    category: {
      type: String,
      trim: true,
      default: null,
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


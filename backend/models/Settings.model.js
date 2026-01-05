import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    general: {
      contactEmail: { type: String, trim: true, default: '' },
      contactPhone: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      businessHours: { type: String, trim: true, default: 'Mon-Fri 9AM-6PM' },
      timezone: { type: String, default: 'UTC' },
      currency: { type: String, default: 'INR' },
      language: { type: String, default: 'en' },
      socialMedia: {
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        linkedin: { type: String, default: '' },
      },
      defaultCommissionRate: { type: Number, default: 10, min: 0, max: 50 },
      minimumVendorRating: { type: Number, default: 3.0, min: 0, max: 5 },
      vendorApprovalRequired: { type: Boolean, default: true },
      autoApproveVerified: { type: Boolean, default: false },
      vendorProductManagement: { type: Boolean, default: true },
      vendorOrderManagement: { type: Boolean, default: true },
      vendorAnalytics: { type: Boolean, default: true },
    },
    products: {
      itemsPerPage: { type: Number, default: 12, min: 1, max: 100 },
      gridColumns: { type: Number, default: 4, min: 2, max: 6 },
      defaultSort: { type: String, default: 'popularity', enum: ['popularity', 'price-low', 'price-high', 'newest', 'rating'] },
      lowStockThreshold: { type: Number, default: 10, min: 1 },
      outOfStockBehavior: { type: String, default: 'show', enum: ['show', 'hide'] },
      stockAlertsEnabled: { type: Boolean, default: true },
    },
    banners: {
      universalDisplayTime: { type: Number, default: 2000, min: 500 }, // in milliseconds
      bookingWindowDays: { type: Number, default: 30, min: 1, max: 365 }, // booking window in days
      defaultPricePerHour: { type: Number, default: 1999, min: 0 }, // default price for 1 hour
      minDurationHours: { type: Number, default: 1, min: 1 }, // minimum duration in hours
      maxDurationHours: { type: Number, default: 720, min: 1 }, // maximum duration in hours (30 days = 720 hours)
      pricingStructure: {
        type: mongoose.Schema.Types.Mixed,
        default: {
          '1': 1999,      // 1 hour
          '24': 15000,    // 1 day (24 hours)
          '168': 90000,   // 1 week (168 hours)
          '720': 300000   // 1 month (720 hours)
        }
      },
      auditLogs: [{
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
        changes: { type: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now }
      }]
    },
    tax: {
      taxName: { type: String, default: 'Tax', trim: true },
      taxType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      taxValue: { type: Number, default: 0, min: 0 },
      isEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Create a single document - use findOneAndUpdate with upsert
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;


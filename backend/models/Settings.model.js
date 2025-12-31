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
    tax: {
      defaultTaxRate: { type: Number, default: 18, min: 0, max: 100 },
      taxCalculationMethod: { type: String, default: 'exclusive', enum: ['exclusive', 'inclusive'] },
      priceDisplayFormat: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] },
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


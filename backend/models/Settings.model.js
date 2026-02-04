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
      defaultPricePerDay: { type: Number, default: 1999, min: 0 }, // default price for 1 day
      minDurationHours: { type: Number, default: 24, min: 1 }, // minimum duration in hours
      maxDurationHours: { type: Number, default: 720, min: 1 }, // maximum duration in hours (30 days = 720 hours)
      pricingStructure: {
        type: mongoose.Schema.Types.Mixed,
        default: {
          '24': 1999,     // 1 day
          '168': 13000,   // 1 week (7 days)
          '720': 50000    // 1 month (30 days)
        }
      },
      defaultBanner: {
        image: { type: String, default: 'http://localhost:5000/upload/landing_default.png' },
        link: { type: String, default: '/' },
        title: { type: String, default: 'Dealing India - Your Trusted Marketplace' }
      },
      defaultB2BBanner: {
        image: { type: String, default: 'http://localhost:5000/upload/landing_default.png' },
        link: { type: String, default: '/b2b/landing' },
        title: { type: String, default: "India's Biggest Wholesale Network" }
      }
    },
    tax: {
      taxName: { type: String, default: 'Tax', trim: true },
      taxType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      taxValue: { type: Number, default: 0, min: 0 },
      isEnabled: { type: Boolean, default: false },
    },
    features: {
      wishlistEnabled: { type: Boolean, default: true },
      reviewsEnabled: { type: Boolean, default: true },
      flashSaleEnabled: { type: Boolean, default: false },
      dailyDealsEnabled: { type: Boolean, default: false },
      liveChatEnabled: { type: Boolean, default: false },
      couponCodesEnabled: { type: Boolean, default: true },
    },
    homepage: {
      heroBannerEnabled: { type: Boolean, default: true },
      sections: {
        featuredCategories: { enabled: { type: Boolean, default: true } },
        newArrivals: { enabled: { type: Boolean, default: true } },
        bestSellers: { enabled: { type: Boolean, default: true } },
        dealsOfTheDay: { enabled: { type: Boolean, default: false } },
        flashSale: { enabled: { type: Boolean, default: false } },
        topBrands: { enabled: { type: Boolean, default: true } },
      },
    },
    reviews: {
      moderationMode: { type: String, enum: ['auto', 'manual'], default: 'manual' },
      purchaseRequired: { type: Boolean, default: true },
      displaySettings: {
        showAll: { type: Boolean, default: true },
        verifiedOnly: { type: Boolean, default: false },
        withPhotosOnly: { type: Boolean, default: false },
      },
    },
    email: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPassword: { type: String, default: '' },
      fromEmail: { type: String, default: 'noreply@example.com' },
      fromName: { type: String, default: 'Appzeto Store' },
    },
    notifications: {
      email: {
        orderConfirmation: { type: Boolean, default: true },
        shippingUpdate: { type: Boolean, default: true },
        deliveryUpdate: { type: Boolean, default: true },
      },
      smsEnabled: { type: Boolean, default: false },
      pushEnabled: { type: Boolean, default: false },
      admin: {
        newOrders: { type: Boolean, default: true },
        lowStock: { type: Boolean, default: true },
      },
    },
    seo: {
      metaTitle: { type: String, default: 'Appzeto E-commerce - Shop Online' },
      metaDescription: { type: String, default: 'Shop the latest trends and products' },
      metaKeywords: { type: String, default: 'ecommerce, shopping, online store' },
      ogImage: { type: String, default: '' },
      canonicalUrl: { type: String, default: '' },
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


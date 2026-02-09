import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    area: { type: String, trim: true }, // Added area field
    landmark: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }, // For B2B vendors (India-specific)
    country: { type: String, trim: true, default: 'India' },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      validate: {
        validator: function (v) {
          const cleaned = v.replace(/[\s\-\(\)]/g, '');
          return /^(\+?\d{10,15})$/.test(cleaned);
        },
        message: 'Please enter a valid phone number',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [200, 'Store name cannot exceed 200 characters'],
    },
    storeDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'Store description cannot exceed 1000 characters'],
    },
    address: {
      type: addressSchema,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['vendor'],
      default: 'vendor',
    },
    vendorType: {
      type: String,
      enum: ['b2b'], // Only B2B is supported now
      default: 'b2b',
    },
    businessType: {
      type: String,
      trim: true,
      default: 'Textile', // Default for backward compatibility if needed, but will be set during registration
    },
    businessTypeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessType',
    },
    // B2B-specific fields
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          // GST number is optional, no format validation
          if (!v) return true; // Optional field
          return true; // Accept any format
        },
        message: 'GST number is optional',
      },
    },
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      publicId: { type: String },
      type: { type: String }, // MIME type (e.g., 'application/pdf', 'image/jpeg', 'video/mp4')
      uploadedAt: { type: Date, default: Date.now },
    }],
    bankDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    storeLogo: {
      type: String,
      default: null,
    },

    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorSubscription',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (email already has unique: true in field definition)
vendorSchema.index({ phone: 1 }, { unique: true });
vendorSchema.index({ status: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ role: 1 });
vendorSchema.index({ vendorType: 1 }); // Index for B2B vendor queries

// Pre-save middleware: Ensure B2B vendors have commissionRate = 0
// B2B vendors pay subscription fees, NOT commission
vendorSchema.pre('save', function (next) {
  // If vendorType is 'b2b', ensure commissionRate is 0
  if (this.vendorType === 'b2b') {
    this.commissionRate = 0;
  }
  next();
});

// Pre-update middleware: Prevent commission updates for B2B vendors
vendorSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate();

  // Check if commissionRate is being updated
  if (update && update.$set && update.$set.commissionRate !== undefined) {
    // If updating commission, we need to check vendorType
    // This will be validated in the service layer for better error handling
  }

  next();
});

// Remove password from JSON output
vendorSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;


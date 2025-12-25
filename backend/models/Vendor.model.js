import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'USA' },
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
      index: true,
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
      index: true,
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
      index: true,
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
    documents: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    bankDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    storeLogo: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
vendorSchema.index({ email: 1 }, { unique: true });
vendorSchema.index({ phone: 1 }, { unique: true });
vendorSchema.index({ status: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ role: 1 });

// Remove password from JSON output
vendorSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;


import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
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
      trim: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null
      validate: {
        validator: function (v) {
          if (!v) return true; // Phone is optional
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
      enum: ['user'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: null,
    },
    currentMarketplace: {
      type: String,
      enum: ['b2c', 'b2b'],
      default: 'b2c',
    },
    businessInfo: {
      companyName: String,
      companyType: String,
      industry: String,
      gstNumber: String,
      address: {
        city: String,
        state: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (email and phone already have unique: true in field definition)
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;


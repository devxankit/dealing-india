import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Brand name must be at least 2 characters'],
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
    },
    logo: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Please enter a valid website URL',
      },
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (name already has unique: true in field definition)
brandSchema.index({ isActive: 1 });
brandSchema.index({ createdAt: -1 });

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;


import mongoose from 'mongoose';

const b2bCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [1, 'Category name cannot be empty'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    subcategories: {
      type: [String],
      default: [],
      validate: {
        validator: function (subcategories) {
          // Remove duplicates and empty strings
          const unique = [...new Set(subcategories.filter(sub => sub.trim() !== ''))];
          return unique.length === subcategories.length;
        },
        message: 'Subcategories must be unique and non-empty',
      },
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

// Indexes
b2bCategorySchema.index({ name: 1 }, { unique: true });
b2bCategorySchema.index({ isActive: 1 });

// Pre-save middleware to trim subcategory names
b2bCategorySchema.pre('save', function (next) {
  if (this.subcategories && Array.isArray(this.subcategories)) {
    this.subcategories = this.subcategories
      .map(sub => sub.trim())
      .filter(sub => sub !== '');
  }
  next();
});

const B2BCategory = mongoose.model('B2BCategory', b2bCategorySchema);

export default B2BCategory;

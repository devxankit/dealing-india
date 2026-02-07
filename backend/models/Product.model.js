import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allow multiple null values
      uppercase: true,
      maxlength: [100, 'SKU cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    weight: {
      type: Number,
      min: 0,
      default: 0.5, // Default 500g if not specified
      description: "Weight in kg"
    },
    unit: {
      type: String,
      trim: true,
      default: '',
    },
    primaryColorName: {
      type: String,
      trim: true,
      default: '',
    },
    primaryColorCode: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
    images: [String],
    imagesPublicIds: [String],
    stock: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAllowedQuantity: {
      type: Number,
      min: 0,
      default: null,
    },
    minimumOrderQuantity: {
      type: Number,
      min: 1,
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BCategory',
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BCategory',
      default: null,
    },
    subSubCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BCategory',
      default: null,
    },
    brandId: {
      type: mongoose.Schema.Types.Mixed,
    },
    brandName: {
      type: String,
      trim: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    vendorName: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    warrantyPeriod: {
      type: String,
      trim: true,
      default: null,
    },
    guaranteePeriod: {
      type: String,
      trim: true,
      default: null,
    },
    hsnCode: {
      type: String,
      trim: true,
      default: null,
    },

    isNew: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    codAllowed: {
      type: Boolean,
      default: true,
    },
    returnable: {
      type: Boolean,
      default: true,
    },
    cancelable: {
      type: Boolean,
      default: true,
    },
    taxIncluded: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    hasSizes: {
      type: Boolean,
      default: true,
    },
    attributes: {
      type: [
        {
          attributeId: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
          },
          attributeName: {
            type: String,
            trim: true,
          },
          values: [
            {
              type: mongoose.Schema.Types.Mixed,
            },
          ],
          name: {
            type: String,
            trim: true,
          },
          value: {
            type: mongoose.Schema.Types.Mixed,
          },
          group: {
            type: String,
            trim: true,
          },
          isRequired: {
            type: Boolean,
            default: false,
          },
        },
      ],
      default: [],
    },

    productType: {
      type: String,
      enum: ['standard', 'digital', 'service'],
      default: 'standard',
    },
    variants: {
      // Legacy support - keep for backward compatibility
      sizes: {
        type: [String],
        default: [],
      },
      colors: {
        type: [String],
        default: [],
      },
      prices: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      defaultVariant: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      // New comprehensive variation structure
      colorVariants: {
        type: [
          {
            colorName: {
              type: String,
              required: true,
              trim: true,
            },
            colorCode: {
              type: String,
              trim: true,
              default: null, // Hex color code or color name
            },
            thumbnailImage: {
              type: String,
              default: null,
            },
            thumbnailImagePublicId: {
              type: String,
              default: null,
            },
            images: {
              type: [String],
              default: [],
            },
            imagesPublicIds: {
              type: [String],
              default: [],
            },
            sizeVariants: {
              type: [
                {
                  size: {
                    type: String,
                    required: true,
                    trim: true,
                  },
                  price: {
                    type: Number,
                    min: 0,
                    default: null, // null means use base product price
                  },
                  originalPrice: {
                    type: Number,
                    min: 0,
                    default: null,
                  },
                  stockQuantity: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                  },
                  stockStatus: {
                    type: String,
                    enum: ['in_stock', 'low_stock', 'out_of_stock'],
                    default: 'in_stock',
                  },
                },
              ],
              default: [],
            },
          },
        ],
        default: [],
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [200, 'SEO title cannot exceed 200 characters'],
      default: '',
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'SEO description cannot exceed 500 characters'],
      default: '',
    },
    relatedProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
      trim: true,
    },
    // Root level size variants for products without color variants
    sizeVariants: [
      {
        size: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          min: 0,
          default: null, // null means use base product price
        },
        originalPrice: {
          type: Number,
          min: 0,
          default: null,
        },
        stockQuantity: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        stockStatus: {
          type: String,
          enum: ['in_stock', 'low_stock', 'out_of_stock'],
          default: 'in_stock',
        },
      },
    ],
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true, // Suppress warning for isNew field
  }
);

// Pre-save middleware to automatically set stock status based on stockQuantity
productSchema.pre('save', function (next) {
  // Auto-calculate main product stock status based on stockQuantity
  if (this.stockQuantity === 0) {
    this.stock = 'out_of_stock';
  } else if (this.stockQuantity <= 10) {
    this.stock = 'low_stock';
  } else {
    this.stock = 'in_stock';
  }

  // Auto-calculate stock status for root-level size variants
  if (this.sizeVariants && this.sizeVariants.length > 0) {
    this.sizeVariants.forEach(sizeVariant => {
      if (sizeVariant.stockQuantity === 0) {
        sizeVariant.stockStatus = 'out_of_stock';
      } else if (sizeVariant.stockQuantity <= 10) {
        sizeVariant.stockStatus = 'low_stock';
      } else {
        sizeVariant.stockStatus = 'in_stock';
      }
    });
  }

  // Auto-calculate stock status for each size variant in color variants
  if (this.variants?.colorVariants && this.variants.colorVariants.length > 0) {
    this.variants.colorVariants.forEach(colorVariant => {
      if (colorVariant.sizeVariants && colorVariant.sizeVariants.length > 0) {
        colorVariant.sizeVariants.forEach(sizeVariant => {
          if (sizeVariant.stockQuantity === 0) {
            sizeVariant.stockStatus = 'out_of_stock';
          } else if (sizeVariant.stockQuantity <= 10) {
            sizeVariant.stockStatus = 'low_stock';
          } else {
            sizeVariant.stockStatus = 'in_stock';
          }
        });
      }
    });
  }

  next();
});

// Pre-update middleware for findOneAndUpdate operations
productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  // If stockQuantity is being updated, auto-set stock status
  if (update.stockQuantity !== undefined) {
    const stockQuantity = update.stockQuantity;
    if (stockQuantity === 0) {
      update.stock = 'out_of_stock';
    } else if (stockQuantity <= 10) {
      update.stock = 'low_stock';
    } else {
      update.stock = 'in_stock';
    }
    // Remove any manually set stock value that may conflict
    if (update.$set && update.$set.stock !== undefined) {
      delete update.$set.stock;
    }
  }

  // Handle $set operations
  if (update.$set && update.$set.stockQuantity !== undefined) {
    const stockQuantity = update.$set.stockQuantity;
    if (stockQuantity === 0) {
      update.$set.stock = 'out_of_stock';
    } else if (stockQuantity <= 10) {
      update.$set.stock = 'low_stock';
    } else {
      update.$set.stock = 'in_stock';
    }
  }

  next();
});

// Indexes (sku already has unique: true in field definition)
productSchema.index({ name: 1 });
productSchema.index({ vendorId: 1, isActive: 1 });
productSchema.index({ stock: 1, stockQuantity: 1 });
productSchema.index({ subcategoryId: 1, isVisible: 1 });
productSchema.index({ isNew: 1, isVisible: 1 });
productSchema.index({ rating: -1, reviewCount: -1 });

// Compound Indexes for high-performance filtering
productSchema.index({ categoryId: 1, isVisible: 1, price: 1 });
productSchema.index({ vendorId: 1, isVisible: 1, createdAt: -1 });
productSchema.index({ brandId: 1, isVisible: 1 });
productSchema.index({ isActive: 1, isVisible: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, isVisible: 1, isTrending: 1 });
productSchema.index({ isActive: 1, isVisible: 1, flashSale: 1 });
productSchema.index({ name: 'text', description: 'text', brandName: 'text' }); // Search index

export default mongoose.model('Product', productSchema);

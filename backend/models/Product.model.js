import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
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
    unit: {
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
      index: true,
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
      ref: 'Category',
      index: true,
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
      default: null,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
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
      index: true,
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
    flashSale: {
      type: Boolean,
      default: false,
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
      index: true,
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
    variants: {
      sizes: {
        type: [String],
        default: [],
      },
      colors: {
        type: [String],
        default: [],
      },
      materials: {
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
    attributes: {
      type: [
        {
          attributeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Attribute',
            required: true,
          },
          attributeName: {
            type: String,
            required: true,
            trim: true,
          },
          values: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'AttributeValue',
            default: [],
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ name: 1 });
productSchema.index({ vendorId: 1, isActive: 1 });
productSchema.index({ stock: 1, stockQuantity: 1 });
productSchema.index({ categoryId: 1, isVisible: 1 });
productSchema.index({ subcategoryId: 1, isVisible: 1 });
productSchema.index({ brandId: 1, isVisible: 1 });
productSchema.index({ isFeatured: 1, isVisible: 1 });
productSchema.index({ flashSale: 1, isVisible: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;


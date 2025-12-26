import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    route: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['flash_sale', 'daily_deal', 'special_offer', 'festival'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'buy_x_get_y'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    pageConfig: {
      showCountdown: {
        type: Boolean,
        default: true,
      },
      countdownType: {
        type: String,
        enum: ['campaign_end', 'daily_reset', 'custom'],
        default: 'campaign_end',
      },
      viewModes: {
        type: [String],
        enum: ['grid', 'list'],
        default: ['grid', 'list'],
      },
      defaultViewMode: {
        type: String,
        enum: ['grid', 'list'],
        default: 'grid',
      },
      enableFilters: {
        type: Boolean,
        default: true,
      },
      enableSorting: {
        type: Boolean,
        default: true,
      },
      productsPerPage: {
        type: Number,
        default: 12,
        min: 6,
        max: 48,
      },
      showStats: {
        type: Boolean,
        default: true,
      },
    },
    bannerConfig: {
      title: {
        type: String,
        trim: true,
        default: '',
      },
      subtitle: {
        type: String,
        trim: true,
        default: '',
      },
      imageUrl: {
        type: String,
        trim: true,
        default: '',
      },
      imagePublicId: {
        type: String,
        trim: true,
        default: null,
      },
      customImage: {
        type: Boolean,
        default: false,
      },
    },
    autoCreateBanner: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
campaignSchema.index({ type: 1, isActive: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ slug: 1 }, { unique: true });

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;


import mongoose from 'mongoose';

const bannerSlotSchema = new mongoose.Schema(
  {
    slotNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 10,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingStructure: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BannerBooking',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const BannerSlot = mongoose.model('BannerSlot', bannerSlotSchema);

export default BannerSlot;

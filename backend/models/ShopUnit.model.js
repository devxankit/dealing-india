import mongoose from 'mongoose';

const shopUnitSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Unit Name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        images: [String],
        imagesPublicIds: [String],
        minPrice: {
            type: Number,
            min: 0,
        },
        maxPrice: {
            type: Number,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

shopUnitSchema.index({ vendorId: 1 }, { unique: true });

export default mongoose.model('ShopUnit', shopUnitSchema);

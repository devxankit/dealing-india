import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Property title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        totalArea: {
            type: String, // e.g. "1200 sq ft"
            trim: true,
        },
        propertyType: {
            type: String,
            required: true,
            enum: ['Shop', 'Office', 'Showroom', 'Godown', 'Factory', 'Commercial Building'],
        },
        listingType: {
            type: String,
            required: true,
            enum: ['Sale', 'Rent', 'Lease'],
        },
        price: {
            amount: { type: Number, required: true },
            maintenance: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' },
            utilityBill: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' },
            deposit: { type: Number, default: 0 },
        },
        status: {
            furnishing: { type: String, enum: ['Full', 'Semi', 'Unfurnished'], default: 'Unfurnished' },
            propertyStatus: { type: String, enum: ['New', 'Ready', 'Under Construction'], default: 'Ready' },
        },
        location: {
            address: { type: String, required: true },
            area: { type: String, required: true },
            market: { type: String },
            city: { type: String, required: true },
        },
        media: [
            {
                url: { type: String, required: true },
                publicId: { type: String },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

// Index for geo-spatial queries or basic search
propertySchema.index({ 'location.city': 1, propertyType: 1, listingType: 1 });

const Property = mongoose.model('Property', propertySchema);

export default Property;

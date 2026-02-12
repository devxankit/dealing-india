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
            amount: { type: Number },
            maintenance: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' },
            utilityBill: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' },
            deposit: { type: Number, default: 0 },
        },
        status: {
            furnishing: {
                type: String,
                enum: ['Full', 'Semi', 'Unfurnished', 'Fully Furnished', 'Semi Furnished'],
                default: 'Unfurnished'
            },
            propertyStatus: {
                type: String,
                enum: ['New', 'Ready', 'Under Construction', 'Ready to Move'],
                default: 'Ready'
            },
            propertyCondition: {
                type: String,
                enum: ['New', '0-5 years', '5-10 years', '10+ years']
            },
            propertyPosition: {
                type: String,
                enum: ['Ready to Move', 'Under Construction']
            }
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
        images: [String], // New field for simple image URL storage
        isActive: {
            type: Boolean,
            default: true,
        },

        // --- NEW FIELDS ---
        propertyTypes: [String], // Multi-select support

        saleDetails: {
            priceMin: Number,
            priceMax: Number,
            priceUnit: { type: String, enum: ['Thousand', 'Lakh', 'Crore'], default: 'Lakh' },
            depositAmount: Number,
            depositUnit: { type: String, enum: ['Thousand', 'Lakh', 'Crore'], default: 'Lakh' },
            maintenance: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' },
            veraBill: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' }
        },

        rentDetails: {
            monthlyRent: Number,
            rentUnit: { type: String, enum: ['Thousand', 'Lakh', 'Crore'], default: 'Thousand' },
            depositAmount: Number,
            depositUnit: { type: String, enum: ['Thousand', 'Lakh', 'Crore'], default: 'Thousand' },
            maintenance: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' },
            veraBill: { type: String, enum: ['Included', 'Excluded'], default: 'Excluded' }
        },

        leaseDetails: {
            monthlyLeaseRate: Number,
            leaseUnit: { type: String, enum: ['Thousand', 'Lakh', 'Crore'], default: 'Lakh' },
            depositAmount: Number,
            depositUnit: { type: String, enum: ['Thousand', 'Lakh', 'Crore'], default: 'Lakh' },
            leaseDurationYears: Number
        },

        roadFacing: {
            type: String,
            enum: ['Main Road', 'Internal Road']
        },

        specifications: [{
            builtUpArea: String,
            builtUpAreaUnit: { type: String, enum: ['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'] },
            carpetArea: String,
            carpetAreaUnit: { type: String, enum: ['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'] },
            floorNumber: String,
            totalFloors: String,
            ceilingHeight: String,
            ceilingHeightUnit: { type: String, enum: ['Ft.', 'Mt.'] },
            entranceWidth: String,
            entranceWidthUnit: { type: String, enum: ['Ft.', 'Mt.'] },
            maliya: { type: String, enum: ['Yes', 'No'], default: 'No' }
        }],

        facilities: {
            parking: { type: [String], enum: ['Car', 'Two-Wheeler', 'No'] },
            lift: { type: String, enum: ['Yes', 'No'] },
            liftPassenger: { type: String, enum: ['Yes', 'No'] },
            liftLoading: { type: String, enum: ['Yes', 'No'] },
            powerBackup: { type: String, enum: ['Yes', 'No'] },
            waterSupply: { type: String, enum: ['Yes', 'No'] },
            washroom: { type: [String], enum: ['Private', 'Common', 'No'], default: ['Common'] },
            fireSafety: { type: String, enum: ['Yes', 'No'] }
        }
    },
    {
        timestamps: true,
    }
);

// Index for geo-spatial queries or basic search
propertySchema.index({ 'location.city': 1, propertyType: 1, listingType: 1 });
// Performance optimization: Indexes for admin panel queries
propertySchema.index({ vendorId: 1 });
propertySchema.index({ isActive: 1 });
propertySchema.index({ vendorId: 1, isActive: 1, createdAt: -1 });
propertySchema.index({ listingType: 1, isActive: 1 });

const Property = mongoose.model('Property', propertySchema);

export default Property;

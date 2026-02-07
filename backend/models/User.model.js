import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
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
            enum: ['user', 'admin'],
            default: 'user',
        },
        avatar: {
            type: String,
            default: null,
        },
        currentMarketplace: {
            type: String,
            enum: ['b2b'],
            default: 'b2b',
        },
        businessInfo: {
            companyName: { type: String, trim: true },
            industry: { type: String, trim: true },
            companyType: { type: String, trim: true },
            gstNumber: { type: String, trim: true },
            address: {
                city: { type: String, trim: true },
                state: { type: String, trim: true }
            }
        },
        addresses: [{
            streetAddress: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            country: { type: String, default: 'India' },
            isDefault: { type: Boolean, default: false },
            addressType: { type: String, enum: ['Home', 'Work', 'Warehouse', 'Other'], default: 'Work' },
            phone: { type: String }
        }],
    },
    {
        timestamps: true,
    }
);

// Remove password from JSON output
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const User = mongoose.model('User', userSchema);

export default User;

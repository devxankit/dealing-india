import mongoose from 'mongoose';

const policySchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            enum: ['privacy', 'refund', 'terms'],
            trim: true,
        },
        content: {
            type: String,
            required: true,
            default: '',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Assuming admins are Users with role 'admin'
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

const Policy = mongoose.model('Policy', policySchema);

export default Policy;

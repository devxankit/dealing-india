import ShopUnit from '../models/ShopUnit.model.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';

export const getMyUnit = async (req, res, next) => {
    try {
        const unit = await ShopUnit.findOne({ vendorId: req.user.vendorId });
        res.status(200).json({ success: true, data: unit });
    } catch (error) {
        next(error);
    }
};

export const createOrUpdateUnit = async (req, res, next) => {
    try {
        const { name, description, images, minPrice, maxPrice } = req.body;
        const vendorId = req.user.vendorId;

        let unit = await ShopUnit.findOne({ vendorId });

        const imageUrls = [];
        const imagePublicIds = [];

        if (images && images.length > 0) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    const result = await uploadBase64ToCloudinary(img, 'shops/b2b');
                    imageUrls.push(result.secure_url);
                    imagePublicIds.push(result.public_id);
                } else if (img.startsWith('http')) {
                    imageUrls.push(img);
                }
            }
        }

        const unitData = {
            name: name.trim(),
            description,
            images: imageUrls,
            imagesPublicIds: imagePublicIds,
            minPrice: minPrice ? parseFloat(minPrice) : 0,
            maxPrice: maxPrice ? parseFloat(maxPrice) : 0,
            vendorId,
        };

        if (unit) {
            unit = await ShopUnit.findByIdAndUpdate(unit._id, unitData, { new: true });
        } else {
            unit = await ShopUnit.create(unitData);
        }

        res.status(201).json({ success: true, data: unit });
    } catch (error) {
        next(error);
    }
};

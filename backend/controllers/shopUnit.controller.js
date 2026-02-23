import ShopUnit from '../models/ShopUnit.model.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';

export const getMyUnit = async (req, res, next) => {
    try {
        const shop = await ShopUnit.findOne({ vendorId: req.user.vendorId });
        res.status(200).json({ success: true, data: shop });
    } catch (error) {
        next(error);
    }
};

export const createOrUpdateUnit = async (req, res, next) => {
    try {
        const { name, description, images, minPrice, maxPrice } = req.body;
        const vendorId = req.user.vendorId;

        let shop = await ShopUnit.findOne({ vendorId });

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

        const shopData = {
            name: name.trim(),
            description,
            images: imageUrls,
            imagesPublicIds: imagePublicIds,
            minPrice: minPrice ? parseFloat(minPrice) : 0,
            maxPrice: maxPrice ? parseFloat(maxPrice) : 0,
            vendorId,
        };

        if (shop) {
            shop = await ShopUnit.findByIdAndUpdate(shop._id, shopData, { new: true });
        } else {
            shop = await ShopUnit.create(shopData);
        }

        // Cache Invalidation for Public Vendor Profiles
        try {
            const redisService = (await import('../services/redis.service.js')).default;
            await redisService.del(`vendor:details:${vendorId}`);
            await redisService.clearPattern('vendors:list:*');
        } catch (cacheError) {
            console.error('Cache invalidation error (createOrUpdateUnit):', cacheError);
        }

        res.status(201).json({ success: true, data: shop });
    } catch (error) {
        next(error);
    }
};

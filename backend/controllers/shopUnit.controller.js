import ShopUnit from '../models/ShopUnit.model.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinary.util.js';
import subscriptionRulesService from '../services/subscriptionRules.service.js';

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
        const { name, description, images, minPrice, maxPrice, details, businessCategory, mapUrl } = req.body;
        const vendorId = req.user.vendorId;

        // Ensure eligibility before listing shop
        const eligibilityCheck = await subscriptionRulesService.canListShop(vendorId);
        if (!eligibilityCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: eligibilityCheck.message,
                subscriptionRequired: true
            });
        }

        // Check for slideshow permission if more than 1 image is provided
        if (images && images.length > 1) {
            const slideshowCheck = await subscriptionRulesService.canUseShopSlideshow(vendorId);
            if (!slideshowCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    message: slideshowCheck.message,
                    subscriptionRequired: slideshowCheck.subscriptionRequired
                });
            }
        }

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
            details: Array.isArray(details) ? details : [],
            images: imageUrls,
            imagesPublicIds: imagePublicIds,
            minPrice: minPrice ? parseFloat(minPrice) : 0,
            maxPrice: maxPrice ? parseFloat(maxPrice) : 0,
            vendorId,
            businessCategory: businessCategory && businessCategory.trim() ? businessCategory.trim() : null,
            mapUrl: mapUrl && mapUrl.trim ? mapUrl.trim() : mapUrl || null,
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

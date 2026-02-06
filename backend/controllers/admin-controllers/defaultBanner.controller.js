import Banner from '../../models/Banner.model.js';
import { uploadToCloudinary } from '../../utils/cloudinary.util.js';

export const getAllBanners = async (req, res, next) => {
    try {
        const { bannerType } = req.query;
        const query = {};
        if (bannerType) {
            query.bannerType = bannerType;
        }
        const banners = await Banner.find(query).sort({ order: 1 });
        res.status(200).json({
            success: true,
            data: banners
        });
    } catch (error) {
        next(error);
    }
};

export const createBanner = async (req, res, next) => {
    try {
        const bannerData = { ...req.body };

        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'default-banners');
            bannerData.image = uploadResult.secure_url;
        }

        const banner = await Banner.create(bannerData);
        res.status(201).json({
            success: true,
            data: banner
        });
    } catch (error) {
        next(error);
    }
};

export const updateBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const bannerData = { ...req.body };

        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'default-banners');
            bannerData.image = uploadResult.secure_url;
        }

        const banner = await Banner.findByIdAndUpdate(id, bannerData, { new: true, runValidators: true });

        if (!banner) {
            const error = new Error('Banner not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: banner
        });
    } catch (error) {
        next(error);
    }
};

export const deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByIdAndDelete(id);

        if (!banner) {
            const error = new Error('Banner not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

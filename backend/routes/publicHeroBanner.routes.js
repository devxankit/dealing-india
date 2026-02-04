import express from 'express';
import * as heroBannerService from '../services/heroBanner.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

router.get('/active', asyncHandler(async (req, res) => {
  const { bannerType } = req.query; // Get bannerType from query params ('hero' or 'b2b')
  const banners = await heroBannerService.getActiveBanners(bannerType);
  const settings = await heroBannerService.getBannerSettings();

  res.status(200).json({
    success: true,
    data: { banners, settings }
  });
}));

export default router;

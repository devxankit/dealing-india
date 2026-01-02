import express from 'express';
import * as heroBannerService from '../services/heroBanner.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.get('/active', asyncHandler(async (req, res) => {
  const banners = await heroBannerService.getActiveBanners();
  const settings = await heroBannerService.getBannerSettings();
  
  res.status(200).json({
    success: true,
    data: { banners, settings }
  });
}));

export default router;

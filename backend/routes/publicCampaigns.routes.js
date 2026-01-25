import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import {
  getCampaigns,
  getCampaign,
} from '../controllers/public-controllers/publicCampaigns.controller.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// Public campaigns routes (no authentication required)
router.get('/', redisService.cacheMiddleware('public:campaigns', 1800), asyncHandler(getCampaigns));
router.get('/:id', redisService.cacheMiddleware('campaign:details', 1800), asyncHandler(getCampaign));

export default router;




















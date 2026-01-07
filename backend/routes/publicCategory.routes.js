import express from 'express';
import {
    getCategories,
    getCategory,
} from '../controllers/admin-controllers/categoryManagement.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import redisService from '../services/redis.service.js';

const router = express.Router();

// Public category routes (no authentication required)
router.get('/', redisService.cacheMiddleware('home:categories', 600), asyncHandler(getCategories));
router.get('/:id', redisService.cacheMiddleware('category:details', 600), asyncHandler(getCategory));

export default router;

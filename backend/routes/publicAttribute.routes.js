import express from 'express';
import {
    getAll,
    getById,
} from '../controllers/vendor-controllers/attribute.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// Public attribute routes (no authentication required)
router.get('/', redisService.cacheMiddleware('public:attributes', 3600), asyncHandler(getAll));
router.get('/:id', redisService.cacheMiddleware('attribute:details', 3600), asyncHandler(getById));

export default router;

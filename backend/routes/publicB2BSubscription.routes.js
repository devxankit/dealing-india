import express from 'express';
import AdminB2BSubscriptionPlanController from '../controllers/b2bSubscriptionPlan.controller.js';
import redisService from '../services/redis.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Get active B2B subscription plans (Public/Vendor accessible)
router.get('/active', redisService.cacheMiddleware('public:b2b-plans', 3600), asyncHandler(AdminB2BSubscriptionPlanController.getActivePlans));

// Get plan by ID
router.get('/:id', redisService.cacheMiddleware('b2b-plan:details', 3600), asyncHandler(AdminB2BSubscriptionPlanController.getPlanById));

export default router;

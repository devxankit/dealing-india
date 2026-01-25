import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
    createReturnRequest,
    getUserReturns,
    getReturnEligibility
} from '../controllers/user-controllers/returnRequest.controller.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.post('/', createReturnRequest);
router.get('/', redisService.cacheMiddleware('user:returns:list', 300), getUserReturns);
router.get('/eligibility/:orderId', redisService.cacheMiddleware('user:returns:eligibility', 300), getReturnEligibility);

export default router;

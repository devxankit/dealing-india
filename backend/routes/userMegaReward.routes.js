import express from 'express';
import {
    getActiveCampaign,
    getMyStatus,
    generateShareLink,
    getMyEntry,
    tryGenerateTicket
} from '../controllers/user-controllers/megaRewardUser.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate);

// Get active campaign for user app display
router.get('/active', redisService.cacheMiddleware('user:mega-reward:active', 300), getActiveCampaign);

// Get user's current participation status
router.get('/my-status', redisService.cacheMiddleware('user:mega-reward:status', 120), getMyStatus);

// Get user's current entry/ticket
router.get('/my-entry', redisService.cacheMiddleware('user:mega-reward:entry', 300), getMyEntry);

// Generate share link for a platform
router.post('/share-link', generateShareLink);

// Try to generate ticket (if eligible)
router.post('/generate-ticket', tryGenerateTicket);

export default router;

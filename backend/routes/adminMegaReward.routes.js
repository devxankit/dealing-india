import express from 'express';
import {
    createSettings,
    updateSettings,
    getAllSettings,
    getActiveSettings,
    getSettingsById,
    deleteSettings
} from '../controllers/admin-controllers/megaRewardSettings.controller.js';
import {
    getEntries,
    getEntryStats,
    getEntryById
} from '../controllers/admin-controllers/megaRewardEntry.controller.js';
import {
    declareWinner,
    getWinners,
    getWinnerStatus
} from '../controllers/admin-controllers/megaRewardWinner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes are protected and require admin role
router.use(authenticate, authorize('admin', 'superadmin'));

// ==================== SETTINGS ROUTES ====================
router.route('/settings')
    .get(redisService.cacheMiddleware('admin:mega-reward:settings', 600), getAllSettings)
    .post(createSettings);

router.get('/settings/active', redisService.cacheMiddleware('admin:mega-reward:active', 600), getActiveSettings);

router.route('/settings/:id')
    .get(redisService.cacheMiddleware('admin:mega-reward:details', 600), getSettingsById)
    .put(updateSettings)
    .delete(deleteSettings);

// ==================== ENTRIES ROUTES ====================
router.get('/entries', redisService.cacheMiddleware('admin:mega-reward:entries', 300), getEntries);
router.get('/entries/stats', redisService.cacheMiddleware('admin:mega-reward:stats', 300), getEntryStats);
router.get('/entries/:id', redisService.cacheMiddleware('admin:mega-reward:entry-details', 300), getEntryById);

// ==================== WINNERS ROUTES ====================
router.post('/winners/declare', declareWinner);
router.get('/winners', redisService.cacheMiddleware('admin:mega-reward:winners', 300), getWinners);
router.get('/winners/status', redisService.cacheMiddleware('admin:mega-reward:winner-status', 300), getWinnerStatus);

export default router;

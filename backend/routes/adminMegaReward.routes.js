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

const router = express.Router();

// All routes are protected and require admin role
router.use(authenticate, authorize('admin', 'superadmin'));

// ==================== SETTINGS ROUTES ====================
router.route('/settings')
    .get(getAllSettings)
    .post(createSettings);

router.get('/settings/active', getActiveSettings);

router.route('/settings/:id')
    .get(getSettingsById)
    .put(updateSettings)
    .delete(deleteSettings);

// ==================== ENTRIES ROUTES ====================
router.get('/entries', getEntries);
router.get('/entries/stats', getEntryStats);
router.get('/entries/:id', getEntryById);

// ==================== WINNERS ROUTES ====================
router.post('/winners/declare', declareWinner);
router.get('/winners', getWinners);
router.get('/winners/status', getWinnerStatus);

export default router;

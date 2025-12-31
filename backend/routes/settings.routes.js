import express from 'express';
import { getSettingsController, updateSettingsController } from '../controllers/admin-controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Get settings
router.get('/', asyncHandler(getSettingsController));

// Update settings category
router.put('/:category', asyncHandler(updateSettingsController));

export default router;


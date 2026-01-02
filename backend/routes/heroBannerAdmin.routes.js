import express from 'express';
import {
  getSlots,
  updateSettings,
  getBookings
} from '../controllers/admin-controllers/heroBanner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/slots', asyncHandler(getSlots));
router.get('/bookings', asyncHandler(getBookings));
router.put('/settings', asyncHandler(updateSettings));

export default router;

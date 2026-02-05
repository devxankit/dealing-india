import express from 'express';
import {
  getSlots,
  updateSlot,
  updateSettings,
  getBookings,
  getBooking,
  approveBooking,
  rejectBooking,
  getRevenueStats,
  getTransactions
} from '../controllers/admin-controllers/heroBanner.controller.js';
import {
  getAllBanners as getDefaultBanners,
  createBanner as createDefaultBanner,
  updateBanner as updateDefaultBanner,
  deleteBanner as deleteDefaultBanner
} from '../controllers/admin-controllers/defaultBanner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// Default Banners (System Fallbacks)
router.get('/default-banners', asyncHandler(getDefaultBanners));
router.post('/default-banners', upload.single('image'), asyncHandler(createDefaultBanner));
router.put('/default-banners/:id', upload.single('image'), asyncHandler(updateDefaultBanner));
router.delete('/default-banners/:id', asyncHandler(deleteDefaultBanner));

router.get('/slots', asyncHandler(getSlots));
router.get('/bookings', asyncHandler(getBookings));
router.get('/bookings/:id', asyncHandler(getBooking));
router.get('/revenue-stats', asyncHandler(getRevenueStats));
router.get('/transactions', asyncHandler(getTransactions));
router.put('/slots/:id', asyncHandler(updateSlot));
router.put('/settings', asyncHandler(updateSettings));
router.put('/bookings/:id/approve', asyncHandler(approveBooking));
router.put('/bookings/:id/reject', asyncHandler(rejectBooking));

export default router;

import express from 'express';
import {
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  updateOfferStatus,
} from '../controllers/admin-controllers/offers.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Offers (Campaigns) routes
router.get('/', asyncHandler(getOffers));
router.get('/:id', asyncHandler(getOffer));
router.post('/', upload.single('image'), asyncHandler(createOffer));
router.put('/:id', upload.single('image'), asyncHandler(updateOffer));
router.patch('/:id/status', asyncHandler(updateOfferStatus));
router.delete('/:id', asyncHandler(deleteOffer));

export default router;


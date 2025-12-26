import express from 'express';
import {
  getReels,
  getReel,
  create,
  update,
  remove,
  updateStatus,
} from '../controllers/vendor-controllers/vendorReels.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get('/', asyncHandler(getReels));
router.get('/:id', asyncHandler(getReel));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));
router.patch('/:id/status', asyncHandler(updateStatus));

export default router;


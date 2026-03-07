import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
  adminListReels,
  adminGetReel,
  adminApproveReel,
  adminRejectReel,
  adminDeleteReel,
} from '../controllers/reel.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', asyncHandler(adminListReels));
router.get('/:id', asyncHandler(adminGetReel));
router.post('/:id/approve', asyncHandler(adminApproveReel));
router.post('/:id/reject', asyncHandler(adminRejectReel));
router.delete('/:id', asyncHandler(adminDeleteReel));

export default router;

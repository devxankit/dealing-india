import express from 'express';
import {
  getBrands,
  getBrand,
  create,
  update,
  remove,
  bulkDelete,
  toggleStatus,
} from '../controllers/admin-controllers/brandManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Brand management routes
router.get('/', asyncHandler(getBrands));
router.get('/:id', asyncHandler(getBrand));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/bulk', asyncHandler(bulkDelete));
router.put('/:id/toggle-status', asyncHandler(toggleStatus));
router.delete('/:id', asyncHandler(remove));

export default router;


import express from 'express';
import {
  getCategories,
  getCategory,
  create,
  update,
  remove,
  bulkDelete,
  bulkUpdateOrder,
} from '../controllers/admin-controllers/categoryManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Category management routes
router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategory));
router.post('/', asyncHandler(create));
router.put('/bulk-order', asyncHandler(bulkUpdateOrder));
router.put('/:id', asyncHandler(update));
router.delete('/bulk', asyncHandler(bulkDelete));
router.delete('/:id', asyncHandler(remove));

export default router;


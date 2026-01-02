import express from 'express';
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from '../controllers/vendor-controllers/attributeValue.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get('/', asyncHandler(getAll));
router.get('/:id', asyncHandler(getById));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

// Debug: Log route registration
console.log('✅ Vendor attribute-values routes registered at /api/vendor/attribute-values');

export default router;


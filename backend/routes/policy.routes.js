import express from 'express';
import {
  getAll,
  getByKey,
  upsert,
} from '../controllers/admin-controllers/policy.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Routes
router.get('/', asyncHandler(getAll));
router.get('/:key', asyncHandler(getByKey));
router.put('/:key', asyncHandler(upsert));

export default router;


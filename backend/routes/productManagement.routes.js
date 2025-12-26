import express from 'express';
import {
  getProducts,
  getProduct,
  create,
  update,
  remove,
} from '../controllers/admin-controllers/productManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Product management routes
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

export default router;


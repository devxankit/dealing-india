import express from 'express';
import {
  getFAQs,
  getFAQ,
  create,
  update,
  remove,
} from '../controllers/admin-controllers/productFAQs.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Product FAQs routes
router.get('/', asyncHandler(getFAQs));
router.get('/:id', asyncHandler(getFAQ));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

export default router;


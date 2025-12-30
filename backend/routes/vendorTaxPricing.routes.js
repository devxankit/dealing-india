import express from 'express';
import {
  getProducts,
  updatePrice,
  updateTaxRate,
  bulkUpdatePrices,
} from '../controllers/vendor-controllers/vendorTaxPricing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get(
  '/products',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('sortBy').optional().isIn(['createdAt', 'name', 'price']).withMessage('Invalid sortBy'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sortOrder'),
  ],
  asyncHandler(getProducts)
);

router.patch(
  '/products/:id/price',
  asyncHandler(updatePrice)
);

router.patch(
  '/products/:id/tax-rate',
  asyncHandler(updateTaxRate)
);

router.post(
  '/products/bulk-update',
  asyncHandler(bulkUpdatePrices)
);

export default router;


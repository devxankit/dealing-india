import express from 'express';
import {
  getTaxRules,
  getTaxRule,
  create,
  update,
  remove,
  getPricingRules,
  getPricingRule,
  createPricing,
  updatePricing,
  removePricing,
} from '../controllers/admin-controllers/taxPricing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Tax Rules routes
router.get('/tax-rules', asyncHandler(getTaxRules));
router.get('/tax-rules/:id', asyncHandler(getTaxRule));
router.post('/tax-rules', asyncHandler(create));
router.put('/tax-rules/:id', asyncHandler(update));
router.delete('/tax-rules/:id', asyncHandler(remove));

// Pricing Rules routes
router.get('/pricing-rules', asyncHandler(getPricingRules));
router.get('/pricing-rules/:id', asyncHandler(getPricingRule));
router.post('/pricing-rules', asyncHandler(createPricing));
router.put('/pricing-rules/:id', asyncHandler(updatePricing));
router.delete('/pricing-rules/:id', asyncHandler(removePricing));

export default router;


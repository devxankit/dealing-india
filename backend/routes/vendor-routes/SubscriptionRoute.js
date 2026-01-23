import express from 'express';
import {
  createSubscription,
  getSubscriptionByAdmin,
  getAllSubscriptions,
  cancelSubscription,
  createB2BSubscription,
  getB2BSubscription,
  getAllB2BSubscriptions,
  cancelB2BSubscription,
  getAllPlans,
  getSubscriptionDetails,
  getAllB2BPlans,
  getB2BSubscriptionDetails,
} from '../../controllers/SubscriptionCtrl.js';

import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/* ============ B2C SUBSCRIPTION ROUTES ============ */

// Get all B2C subscription plans (tiers)
router.get('/plans', authorize('vendor', 'admin'), getAllPlans);

// Create a B2C subscription (purchase)
router.post('/createB2CSubscription', authorize('vendor'), createSubscription);

// Get current vendor's subscriptions
router.get('/getB2CSubscription', authorize('vendor', 'admin'), getSubscriptionByAdmin);

// Get all subscriptions (admin only)
router.get('/getAllB2CSubscriptions', authorize('admin'), getAllSubscriptions);

// Get subscription details by ID
router.get('/getB2CSubscription/:subscriptionId', authorize('vendor', 'admin'), getSubscriptionDetails);

// Cancel subscription
router.patch(
  '/cancelB2CSubscription/:subscriptionId',
  authorize('vendor', 'admin'),
  cancelSubscription
);


/* ============ B2B SUBSCRIPTION ROUTES ============ */

// Get all B2B subscription plans
router.get('/b2b-plans', authorize('vendor', 'admin'), getAllB2BPlans);

// Create a B2B subscription (purchase)
router.post('/createB2BSubscription', authorize('vendor', 'admin'), createB2BSubscription);

// Get current vendor's B2B subscriptions
router.get('/getB2BSubscription', authorize('vendor', 'admin'), getB2BSubscription);

// Get all B2B subscriptions (admin only)
router.get('/getAllB2BSubscriptions', authorize('admin'), getAllB2BSubscriptions);

// Get B2B subscription details by ID
router.get('/getB2BSubscription/:subscriptionId', authorize('vendor', 'admin'), getB2BSubscriptionDetails);

// Cancel B2B subscription
router.patch(
  '/cancelB2BSubscription/:subscriptionId',
  authorize('vendor', 'admin'),
  cancelB2BSubscription
);

export default router;

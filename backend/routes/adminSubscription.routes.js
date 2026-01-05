import express from 'express';
import AdminSubscriptionController from '../controllers/admin-controllers/adminSubscription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { logSubscriptionChange } from '../middleware/subscriptionAudit.middleware.js';

const router = express.Router();

// All admin routes are protected and authorized for admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/tiers', AdminSubscriptionController.getTiers);
router.post('/tiers', logSubscriptionChange('create_tier'), AdminSubscriptionController.createTier);
router.put('/tiers/:id', logSubscriptionChange('update_tier'), AdminSubscriptionController.updateTier);
router.get('/analytics', AdminSubscriptionController.getAnalytics);
router.get('/monitoring', AdminSubscriptionController.getMonitoring);
router.post('/manual-override', logSubscriptionChange('manual_override'), AdminSubscriptionController.manualOverride);

export default router;
